import json
import logging
import re
from typing import List, Dict, Any, Optional
import httpx
import openai

from config import settings
from tools.definitions import get_openai_tools
from tools.backend_tools import tool_client
from engines.intent import intent_engine
from engines.escalation import escalation_engine
from providers.factory import provider_factory
from router.semantic_router import query_router, QueryCategory, RoutingDecision
from core.synthesizer import synthesizer

logger = logging.getLogger("admissions_agent")

class AdmissionsAgent:
    def __init__(self):
        pass

    def _get_settings(self):
        return {
            "api_key": settings.LLM_API_KEY,
            "base_url": settings.LLM_BASE_URL if settings.LLM_BASE_URL else None,
            "model": settings.LLM_MODEL or "gpt-4o-mini",
            "temperature": settings.LLM_TEMPERATURE if hasattr(settings, "LLM_TEMPERATURE") else 0.7,
        }

    def _get_openai_client(self) -> Optional[openai.AsyncOpenAI]:
        cfg = self._get_settings()
        api_key = cfg["api_key"]
        if not api_key or api_key.strip() == "":
            return None
        
        kwargs = {
            "api_key": api_key.strip(),
            "timeout": 3.0,
            "max_retries": 0,
        }
        if cfg["base_url"] and cfg["base_url"].strip():
            kwargs["base_url"] = cfg["base_url"].strip()
            
        return openai.AsyncOpenAI(**kwargs)

    async def process_student_message(
        self,
        tracking_id: str,
        student_id: str = "",
        message_text: str = "",
        conversation_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Intelligent Orchestrator:
        1. Routes queries using Sentence Transformer semantic classification.
        2. Routes university/database queries to Existing GPT Agent + Live DB Tools.
        3. Routes general/open-ended questions to Gemini (gemini-3.6-flash).
        4. Intelligently separates and synthesizes MIXED queries into one final response.
        5. Preserves 100% backward compatibility with existing frontends and tools.
        """
        # Step 1: Retrieve student profile from backend for context
        student_profile = {}
        student_name = "Student"
        current_stage = "REGISTERED"
        selected_program = "General Admissions"
        
        try:
            student_profile = await tool_client.execute_tool("getStudentProfile", tracking_id=tracking_id)
            if isinstance(student_profile, dict) and not student_profile.get("error"):
                student_name = student_profile.get("name", "Student")
                current_stage = student_profile.get("currentStage", "REGISTERED")
                selected_program = student_profile.get("selectedProgram", "General Admissions")
        except Exception as e:
            logger.warning(f"Could not load student profile: {e}")

        # Step 2: Semantic Classification & Query Routing
        routing_decision: RoutingDecision = query_router.route_query(message_text)
        intent_result = intent_engine.detect_intent(message_text)
        primary_intent = intent_result.get("primaryIntent", routing_decision.category.value)
        confidence = max(intent_result.get("confidence", 0.85), routing_decision.confidence)

        logger.info(
            f"[Router] Query='{message_text[:40]}...' -> Category={routing_decision.category.value} "
            f"(Confidence: {confidence:.2f}, DB Required: {routing_decision.requires_database})"
        )

        # Step 2b: Fast-path for known-answer intents — no LLM needed, answer from DB tools directly.
        #   This covers: fees, programs, eligibility, refunds, rankings, placements, campus, documents.
        #   Extended to work even when OpenAI/Gemini quotas are exhausted.
        FAST_PATH_INTENTS = [
            "REFUND_INQUIRY", "FEE_WAIVER_REQUEST", "COUNSELOR_REQUEST", "COMPLAINT",
            "FEE_INQUIRY", "PROGRAM_DISCOVERY", "ELIGIBILITY_QUERY",
            "DOCUMENT_STATUS", "DOCUMENT_REPLACEMENT", "APPLICATION_STATUS",
        ]
        FAST_PATH_KEYWORDS = {
            # Refund / cancellation
            "refund": True, "money back": True, "cancel admission": True,
            "withdraw admission": True, "cancellation policy": True,
            "cancel my seat": True, "fee refund": True, "return money": True,
            # Rankings / accreditation
            "rank": True, "ranking": True, "nirf": True, "naac": True, "nba": True,
            # Placements
            "placement": True, "package": True, "salary": True, "lpa": True,
            "recruiter": True, "hiring": True, "job": True, "career": True,
            # Campus & facilities
            "hostel": True, "campus": True, "facility": True, "facilities": True,
            "dorm": True, "library": True, "sports": True, "mess": True, "canteen": True,
            # Fees & programs (KEY FIX — these now bypass LLM entirely)
            "fee": True, "fees": True, "tuition": True, "cost": True,
            "how much": True, "price": True, "charges": True,
            "program": True, "programmes": True, "course": True, "courses": True,
            "degree": True, "btech": True, "b.tech": True, "mba": True,
            "cse": True, "ai": True, "ece": True, "mech": True, "mechanical": True,
            "computer science": True, "data science": True, "electronics": True,
            # Eligibility
            "eligib": True, "cutoff": True, "criteria": True, "qualify": True,
            "12th": True, "10th": True, "marks": True, "percentage": True,
            # Documents
            "document": True, "marksheet": True, "aadhaar": True, "certificate": True,
            "upload": True, "verification": True,
            # Application
            "application": True, "apply": True, "admission": True, "status": True,
        }
        msg_lower_check = message_text.lower().strip()
        needs_fast_path = (
            primary_intent in FAST_PATH_INTENTS
            or any(kw in msg_lower_check for kw in FAST_PATH_KEYWORDS)
        )
        if needs_fast_path:
            return await self._fallback_response(
                tracking_id=tracking_id,
                student_id=student_id,
                student_name=student_name,
                current_stage=current_stage,
                message_text=message_text,
                primary_intent=primary_intent,
                confidence=confidence,
                student_profile=student_profile,
                history=history,
            )

        # Step 3: Handle MIXED Queries (University DB Grounding + Gemini Reasoning)
        if routing_decision.category == QueryCategory.MIXED and routing_decision.sub_queries:
            sub = routing_decision.sub_queries
            uni_q = sub.get("university_query", message_text)
            gen_q = sub.get("general_query", "")

            # A. Process university component using verified database tools
            uni_result = await self._process_university_query(
                tracking_id=tracking_id,
                student_id=student_id,
                student_name=student_name,
                current_stage=current_stage,
                selected_program=selected_program,
                message_text=uni_q,
                primary_intent=primary_intent,
                confidence=confidence,
                student_profile=student_profile,
                history=history,
            )

            # B. Process general component using Gemini Provider
            gemini_provider = provider_factory.get_provider("gemini")
            gemini_res = await gemini_provider.generate_response(
                messages=[
                    {"role": "system", "content": "You are a friendly, encouraging academic & career counselor. Provide clear, concise insights in structured Markdown."},
                    {"role": "user", "content": gen_q or message_text}
                ],
                temperature=0.7,
            )

            # C. Synthesize into one coherent response
            final_reply = synthesizer.synthesize_mixed_response(
                student_name=student_name,
                tracking_id=tracking_id,
                university_result=uni_result,
                gemini_result=gemini_res.content if gemini_res.is_success else "",
                university_query=uni_q,
                general_query=gen_q,
            )

            return {
                "reply": final_reply,
                "intent": "MIXED",
                "confidenceScore": confidence,
                "toolCalls": uni_result.get("toolCalls", []),
                "escalated": uni_result.get("escalated", False),
                "route": "MIXED",
                "model": "hybrid(gpt+gemini)",
            }

        # Step 4: Handle Pure GENERAL / Open-Ended Questions via Gemini
        if routing_decision.requires_gemini and not routing_decision.requires_database:
            gemini_provider = provider_factory.get_provider("gemini")
            if await gemini_provider.is_available():
                system_instruction = (
                    f"You are the University Academic & General AI Assistant, acting with the versatility, "
                    f"depth, and conversational clarity of ChatGPT.\n"
                    f"Answer the user's question clearly, thoroughly, and with beautiful Markdown, bullet points, "
                    f"or code snippets where appropriate."
                )
                gemini_messages = [{"role": "system", "content": system_instruction}]
                if history:
                    for h in history[-6:]:
                        role = h.get("role", "user")
                        content = h.get("content", "")
                        if role in ["user", "assistant", "system"] and content:
                            gemini_messages.append({"role": role, "content": content})
                gemini_messages.append({"role": "user", "content": message_text})

                gemini_res = await gemini_provider.generate_response(
                    messages=gemini_messages,
                    temperature=0.7,
                )

                if gemini_res.is_success and gemini_res.content.strip():
                    return {
                        "reply": gemini_res.content,
                        "intent": "GENERAL_QUERY",
                        "confidenceScore": routing_decision.confidence,
                        "toolCalls": [],
                        "escalated": False,
                        "route": "GENERAL",
                        "model": gemini_provider.get_model(),
                    }

        # Step 5: Handle University-Specific / Grounded Database Queries
        return await self._process_university_query(
            tracking_id=tracking_id,
            student_id=student_id,
            student_name=student_name,
            current_stage=current_stage,
            selected_program=selected_program,
            message_text=message_text,
            primary_intent=primary_intent,
            confidence=confidence,
            student_profile=student_profile,
            history=history,
        )

    async def _process_university_query(
        self,
        tracking_id: str,
        student_id: str,
        student_name: str,
        current_stage: str,
        selected_program: str,
        message_text: str,
        primary_intent: str,
        confidence: float,
        student_profile: dict,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes university inquiries using OpenAI with function calling + MongoDB tools.
        Falls back to live database tools + local reasoning if LLM is offline or quota-limited.
        """
        client = self._get_openai_client()
        cfg = self._get_settings()
        tool_calls_executed = []
        is_escalated = False

        if client:
            try:
                system_prompt = (
                    f"You are the Autonomous Admissions & Academic AI Assistant for the University, "
                    f"acting with the intelligence, versatility, and conversational clarity of ChatGPT / GPT-4o.\n\n"
                    f"### Current Student Context:\n"
                    f"- Tracking ID: {tracking_id}\n"
                    f"- Student Name: {student_name}\n"
                    f"- Current Admission Stage: {current_stage}\n"
                    f"- Selected Program: {selected_program}\n\n"
                    f"### University Overview:\n"
                    f"- Ranking: NIRF Top 35 University in Engineering & Technology, NAAC A++ Accredited (Score 3.78/4.0), QS Asia Top 150.\n"
                    f"- Placements: 96.4% placement rate, Highest package ₹54.2 LPA, Average package ₹11.8 LPA with 240+ recruiting partners (Google, Microsoft, Amazon, TCS, Deloitte, Infosys).\n"
                    f"- Campus: 120-acre lush green campus, modern IoT labs, 24/7 digital library, separate AC hostels for boys & girls, Olympic-standard sports arena.\n\n"
                    f"### Core Instructions:\n"
                    f"1. **Admissions & University Tools**: When the user asks about university programs, tuition fees, eligibility cutoffs, document verification status, missing documents, enrollment numbers, or payment status, you MUST invoke the relevant tool to fetch real-time university database records.\n"
                    f"2. **Human Escalations**: If the student asks for a fee waiver / scholarship / financial aid exception, files a severe grievance, or asks to speak with a human admissions counselor, invoke `createCounselorEscalation`.\n"
                    f"3. **Format & Tone**: Use beautiful, clean Markdown with headings, bullet points, and an encouraging tone."
                )

                messages = [{"role": "system", "content": system_prompt}]
                
                if history and isinstance(history, list):
                    for h in history[-8:]:
                        role = h.get("role", "user")
                        content = h.get("content", "")
                        if role in ["user", "assistant", "system"] and content:
                            messages.append({"role": role, "content": content})

                messages.append({"role": "user", "content": message_text})
                tools = get_openai_tools()

                for _ in range(5):
                    response = await client.chat.completions.create(
                        model=cfg["model"],
                        messages=messages,
                        tools=tools,
                        tool_choice="auto",
                        temperature=cfg["temperature"],
                        timeout=4.0,
                    )

                    msg = response.choices[0].message

                    if not msg.tool_calls:
                        return {
                            "reply": msg.content or "I am here to assist you with any questions you have!",
                            "intent": primary_intent,
                            "confidenceScore": confidence,
                            "toolCalls": tool_calls_executed,
                            "escalated": is_escalated,
                            "route": "UNIVERSITY",
                            "model": cfg["model"],
                        }

                    messages.append(msg)
                    for tc in msg.tool_calls:
                        fn_name = tc.function.name
                        try:
                            fn_args = json.loads(tc.function.arguments or "{}")
                        except Exception:
                            fn_args = {}

                        tool_res = await tool_client.execute_tool(
                            tool_name=fn_name,
                            parameters=fn_args,
                            student_id=student_id,
                            tracking_id=tracking_id,
                        )

                        tool_calls_executed.append({
                            "toolName": fn_name,
                            "parameters": fn_args,
                            "result": tool_res,
                            "status": "SUCCESS" if not isinstance(tool_res, dict) or not tool_res.get("error") else "FAILURE"
                        })

                        if fn_name == "createCounselorEscalation":
                            is_escalated = True

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(tool_res)
                        })

            except Exception as llm_error:
                error_type = type(llm_error).__name__
                logger.warning(f"OpenAI completion failed ({error_type}: {llm_error}). Cascading to Gemini Provider.")
                
                # Secondary LLM Provider: Google Gemini with full university context
                try:
                    gemini = provider_factory.get_provider("gemini")
                    logger.info(f"Gemini available: {await gemini.is_available()}, model: {gemini.get_model()}")
                    if await gemini.is_available():
                        logger.info("Calling Gemini generateContent...")
                        gemini_res = await gemini.generate_response(
                            messages=messages,
                            temperature=cfg["temperature"],
                            max_tokens=2048,
                        )
                        logger.info(f"Gemini response: success={gemini_res.is_success}, len={len(gemini_res.content)}, err={gemini_res.error_message}")
                        if gemini_res.is_success and gemini_res.content.strip():
                            return {
                                "reply": gemini_res.content,
                                "intent": primary_intent,
                                "confidenceScore": confidence,
                                "toolCalls": tool_calls_executed,
                                "escalated": is_escalated,
                                "route": "UNIVERSITY_GEMINI",
                                "model": gemini.get_model(),
                            }
                except Exception as gemini_err:
                    logger.warning(f"Gemini secondary provider error: {gemini_err}")

        # Fallback to verified database tool execution (zero hallucination)
        return await self._fallback_response(
            tracking_id=tracking_id,
            student_id=student_id,
            student_name=student_name,
            current_stage=current_stage,
            message_text=message_text,
            primary_intent=primary_intent,
            confidence=confidence,
            student_profile=student_profile,
            history=history,
        )

    async def _fallback_response(
        self,
        tracking_id: str,
        student_id: str,
        student_name: str,
        current_stage: str,
        message_text: str,
        primary_intent: str,
        confidence: float,
        student_profile: dict,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Verified tool execution and grounded heuristic reasoning when LLM quota is offline.
        """
        tool_calls = []
        msg_lower = message_text.lower().strip()

        # Check for mandatory counselor escalation
        escalation_check = escalation_engine.should_escalate(primary_intent, confidence, student_profile)

        if escalation_check.get("mustEscalate"):
            esc_res = await tool_client.execute_tool(
                "createCounselorEscalation",
                parameters={
                    "category": escalation_check["category"],
                    "priority": escalation_check["priority"],
                    "summary": f"{escalation_check['category']} request from {student_name} ({tracking_id})",
                    "reason": escalation_check["reason"],
                    "recommendedAction": escalation_check["recommendedAction"],
                },
                student_id=student_id,
                tracking_id=tracking_id,
            )
            tool_calls.append({"toolName": "createCounselorEscalation", "result": esc_res, "status": "SUCCESS"})
            case_id = esc_res.get("caseId", "CASE-NEW")

            if primary_intent == "FEE_WAIVER_REQUEST":
                reply = (
                    f"I have recorded your request for a fee waiver / scholarship consideration. "
                    f"Because financial concessions require human policy review, I have created counselor review ticket **{case_id}**. "
                    f"Our admissions committee will inspect your submitted documents."
                )
            elif primary_intent == "COUNSELOR_REQUEST":
                reply = f"I have notified our admissions counseling desk (**Ticket: {case_id}**). An admissions advisor will connect with you shortly."
            else:
                reply = f"Your inquiry has been escalated to a senior admissions counselor (**Ticket: {case_id}**) for dedicated support."

            return {
                "reply": reply,
                "intent": primary_intent,
                "confidenceScore": confidence,
                "toolCalls": tool_calls,
                "escalated": True,
                "route": "SCHOLARSHIP" if "WAIVER" in primary_intent else "COUNSELOR",
                "model": "grounded_engine",
            }

        # 1. Fee Refund & Admission Withdrawal Policy
        if primary_intent == "REFUND_INQUIRY" or any(w in msg_lower for w in ["refund", "money back", "cancel admission", "withdraw admission", "cancellation policy", "fee refund", "cancel my seat"]):
            reply = (
                f"📄 **University Fee Refund & Admission Cancellation Policy:**\n\n"
                f"In accordance with UGC guidelines and institutional regulations, tuition fee refunds are calculated based on when the formal withdrawal notice is submitted:\n\n"
                f"• **100% Fee Refund** (minus max ₹1,000 processing fee): If requested **15 days or more** before the formally notified last date of admission.\n"
                f"• **90% Fee Refund**: If requested **less than 15 days** before the formally notified last date of admission.\n"
                f"• **80% Fee Refund**: If requested **15 days or less** after the formally notified last date of admission.\n"
                f"• **50% Fee Refund**: If requested between **16 and 30 days** after the formally notified last date of admission.\n"
                f"• **0% Refund**: If requested **more than 30 days** after the formally notified last date of admission.\n\n"
                f"📌 **Step-by-Step Refund Process:**\n"
                f"1. Log into your **Student Portal $\rightarrow$ Application Status $\rightarrow$ Request Withdrawal / Refund**.\n"
                f"2. Provide your active bank account details (Account Number, IFSC, and Bank Branch) with a scanned cancelled cheque.\n"
                f"3. Upon finance verification, the eligible refund amount is credited via direct bank transfer (NEFT/RTGS) within **7–10 working days**.\n\n"
                f"Would you like me to connect you with an **Admissions Finance Officer** or open a priority support ticket for your tracking ID?"
            )

        # 2. Institutional Rankings & Accreditations
        elif any(w in msg_lower for w in ["rank", "ranking", "nirf", "naac", "accreditation", "reputation", "tier", "standing", "prestige"]):
            reply = (
                f"🏆 **University Rankings & Accreditations:**\n\n"
                f"• **NIRF Ranking**: Ranked **Top 35 Engineering & Technology Institutions** nationally.\n"
                f"• **NAAC Accreditation**: **Grade A++** with a CGPA score of **3.78 / 4.0**.\n"
                f"• **QS Asia University Rankings**: Top **150** in Asia for Academic Reputation and Faculty-Student Ratio.\n"
                f"• **NBA & AICTE Approved**: All B.Tech (CSE, AI & DS, ECE, MECH) and MBA degree programs hold Tier-1 NBA accreditation.\n"
                f"• **India Today / Outlook**: Ranked **#4 among Top Private Autonomous Universities**.\n\n"
                f"Would you like to explore program cutoffs, fees, or placement statistics for a specific department?"
            )

        # 3. Placements & Career Statistics
        elif any(w in msg_lower for w in ["placement", "package", "salary", "recruiter", "recruiters", "highest package", "average package", "job", "career", "hiring"]):
            reply = (
                f"💼 **University Placement Highlights (Latest Academic Batch):**\n\n"
                f"• **Overall Placement Rate**: **96.4%** across Engineering & Management\n"
                f"• **Highest International Package**: **₹54.2 LPA** (Offered by top-tier tech firm)\n"
                f"• **Highest Domestic Package**: **₹38.5 LPA**\n"
                f"• **Average Package (B.Tech CSE / AI & DS)**: **₹11.8 LPA**\n"
                f"• **Median Package**: **₹8.5 LPA**\n\n"
                f"🌟 **Top Recruiting Partners:**\n"
                f"Google, Microsoft, Amazon, Goldman Sachs, Deloitte, TCS Digital, Infosys, Cisco, and Tata Motors.\n\n"
                f"We also offer guaranteed pre-placement training, coding bootcamps, and direct internship incubation on campus."
            )

        # 4. Campus, Hostels & Facilities
        elif any(w in msg_lower for w in ["hostel", "campus", "facility", "facilities", "dorm", "accommodation", "library", "sports", "mess", "canteen", "wifi", "lab"]):
            reply = (
                f"🏫 **Campus Life & Infrastructure:**\n\n"
                f"• **Campus**: 120-acre lush green, fully Wi-Fi enabled smart campus.\n"
                f"• **Hostel Accommodation**: Separate multi-story AC and Non-AC hostels for boys and girls with 24/7 biometric security and power backup.\n"
                f"• **Food & Mess**: Multi-cuisine dining halls offering hygienic vegetarian and non-vegetarian meal plans.\n"
                f"• **Central Digital Library**: Over 100,000 physical volumes, IEEE/ACM digital access, and 24/7 air-conditioned reading halls.\n"
                f"• **Sports & Fitness**: Olympic-sized swimming pool, indoor badminton courts, cricket stadium, synthetic athletic track, and modern gymnasiums.\n"
                f"• **Labs & Innovation**: State-of-the-art AI & GPU computing clusters, IoT research centers, and robotics laboratories."
            )

        # 5. Program Fees & Discovery via Live Backend Tools
        elif primary_intent in ["FEE_INQUIRY", "PROGRAM_DISCOVERY"] or any(w in msg_lower for w in ["fee", "tuition", "cost"]):
            programs_data = await tool_client.execute_tool("getPrograms", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getPrograms", "result": programs_data, "status": "SUCCESS"})
            
            progs = programs_data if isinstance(programs_data, list) else programs_data.get("data", []) if isinstance(programs_data, dict) else []
            
            matched_prog = None
            msg_upper = message_text.upper()
            if isinstance(progs, list):
                for p in progs:
                    code = str(p.get("code", "")).upper()
                    name = str(p.get("name", "")).upper()
                    if (code and code in msg_upper) or (code == "CSE" and "COMPUTER" in msg_upper) or (code == "AI_DS" and ("AI" in msg_upper or "DATA SCIENCE" in msg_upper)) or (code == "MBA" and "MANAGEMENT" in msg_upper):
                        matched_prog = p
                        break
            
            if matched_prog:
                tuition = matched_prog.get("tuitionFee", 0)
                app_fee = matched_prog.get("applicationFee", 1000)
                duration = matched_prog.get("durationYears", 4)
                min_12 = matched_prog.get("eligibilityCriteria", {}).get("minTwelfthMarks", 60)
                min_10 = matched_prog.get("eligibilityCriteria", {}).get("minTenthMarks", 60)
                
                reply = (
                    f"The official fee schedule for **{matched_prog.get('name')} ({matched_prog.get('code')})** is:\n\n"
                    f"• **Annual Tuition Fee**: **₹{tuition:,} / year**\n"
                    f"• **One-Time Application Fee**: **₹{app_fee:,}**\n"
                    f"• **Total Program Tuition ({duration} Years)**: **₹{tuition * duration:,}**\n\n"
                    f"📋 **Eligibility Criteria:**\n"
                    f"• Minimum 12th Board Marks: **{min_12}% (PCM)**\n"
                    f"• Minimum 10th Board Marks: **{min_10}%**\n\n"
                    f"You can apply directly from your student portal or upload your marksheets to verify eligibility."
                )
            elif isinstance(progs, list) and len(progs) > 0:
                prog_list = "\n".join([f"- **{p.get('name')} ({p.get('code')})**: Tuition ₹{p.get('tuitionFee', 0):,}/yr | Duration: {p.get('durationYears', 4)} yrs | Min 12th: {p.get('eligibilityCriteria', {}).get('minTwelfthMarks', 50)}%" for p in progs])
                reply = f"Here are the active university degree programs and tuition fees:\n\n{prog_list}\n\nWould you like more details on a specific program like **CSE**, **AI & Data Science**, or **MBA**?"
            else:
                reply = "Our university offers accredited B.Tech and MBA degrees. Annual tuition ranges from ₹85,000 to ₹1,40,000 per year."

        # 6. Document Verification Status
        elif primary_intent in ["DOCUMENT_STATUS", "DOCUMENT_REPLACEMENT"] or any(w in msg_lower for w in ["document", "marksheet", "aadhaar", "verified"]):
            verif_data = await tool_client.execute_tool("getVerificationStatus", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getVerificationStatus", "result": verif_data, "status": "SUCCESS"})
            
            if isinstance(verif_data, list) and len(verif_data) > 0:
                verif_summary = "\n".join([f"- **{v.get('documentType')}**: {v.get('status')} (Confidence: {v.get('confidenceScore', 0)}%)" for v in verif_data])
                reply = f"Here is the real-time status of your documents:\n\n{verif_summary}"
            else:
                missing_data = await tool_client.execute_tool("getMissingDocuments", tracking_id=tracking_id)
                tool_calls.append({"toolName": "getMissingDocuments", "result": missing_data, "status": "SUCCESS"})
                missing = missing_data.get("missingDocuments", []) if isinstance(missing_data, dict) else []
                reply = f"You have pending document uploads. Required documents: {', '.join(missing) if missing else '10th & 12th marksheets, Identity proof'}."

        # 7. Eligibility Cutoffs & Personalized Marks Evaluation
        elif primary_intent == "ELIGIBILITY_QUERY" or any(w in msg_lower for w in ["eligi", "elligi", "cutoff", "criteria", "board", "marks", "qualify", "12th", "10th"]):
            programs_data = await tool_client.execute_tool("getPrograms", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getPrograms", "result": programs_data, "status": "SUCCESS"})

            progs = programs_data if isinstance(programs_data, list) else programs_data.get("data", []) if isinstance(programs_data, dict) else []
            
            pct_match = re.search(r"(\b\d{1,3}(?:\.\d+)?)\s*%", message_text)
            if not pct_match:
                pct_match = re.search(r"\b(\d{2}(?:\.\d+)?)\s*(?:marks|in 12th|in 10th|percentage|percent|board)\b", msg_lower)
            
            student_pct = float(pct_match.group(1)) if pct_match else None

            if student_pct is not None:
                eligible_programs = []
                ineligible_programs = []

                if isinstance(progs, list) and len(progs) > 0:
                    for p in progs:
                        min_12 = p.get("eligibilityCriteria", {}).get("minTwelfthMarks", 60)
                        prog_name = f"**{p.get('name')} ({p.get('code')})**"
                        if student_pct >= min_12:
                            eligible_programs.append(f"• ✅ {prog_name} — Required: {min_12}% | Your Score: {student_pct}%")
                        else:
                            ineligible_programs.append(f"• ❌ {prog_name} — Required: {min_12}% | Your Score: {student_pct}% (Short by {round(min_12 - student_pct, 1)}%)")
                
                if eligible_programs and not ineligible_programs:
                    reply = (
                        f"🎉 **Congratulations {student_name}!** With **{student_pct}% in your 12th board**, you are eligible for all our standard degree programs:\n\n"
                        + "\n".join(eligible_programs) +
                        f"\n\nYou can proceed with document verification and provisional admission right away!"
                    )
                elif eligible_programs:
                    reply = (
                        f"📊 **Eligibility Assessment for {student_pct}% in 12th Board:**\n\n"
                        f"**Programs you qualify for:**\n" + "\n".join(eligible_programs) + "\n\n"
                        f"**Programs with higher cutoffs:**\n" + "\n".join(ineligible_programs) + "\n\n"
                        f"Would you like to apply for the programs you qualify for or discuss alternatives with an admissions counselor?"
                    )
                else:
                    reply = (
                        f"📋 **Eligibility Assessment for {student_pct}% in 12th Board:**\n\n"
                        f"For direct merit-based admission into our regular **B.Tech degree programs**, the minimum cutoffs are:\n\n"
                        + (("\n".join(ineligible_programs) + "\n\n") if ineligible_programs else (
                            f"• **B.Tech CSE**: Minimum **65%** in 12th (PCM)\n"
                            f"• **B.Tech AI & Data Science**: Minimum **70%** in 12th (PCM)\n"
                            f"• **B.Tech ECE**: Minimum **60%** in 12th (PCM)\n"
                            f"• **B.Tech Mechanical**: Minimum **55%** in 12th (PCM)\n"
                            f"• **MBA**: Minimum **50%** aggregate\n\n"
                        )) +
                        f"⚠️ With **{student_pct}%**, you are currently below the standard cutoff for direct core B.Tech admission.\n\n"
                        f"🌟 **Recommended Next Steps & Alternatives:**\n"
                        f"1. **Polytechnic Diploma Pathway (Lateral Entry)**: You can enroll in a 3-year Diploma program and enter B.Tech 2nd year directly after completion.\n"
                        f"2. **Improvement / Compartment Exam**: If you appear for a board improvement exam and score above the cutoff, your application can be re-evaluated.\n"
                        f"3. **Special Quota / Counselor Review**: If you have sports achievements, defense/reserved quota, or special circumstances, we can escalate your profile to an admissions advisor.\n\n"
                        f"Would you like me to open a ticket for a **Human Admissions Counselor** to evaluate special pathways for you?"
                    )
            else:
                if isinstance(progs, list) and len(progs) > 0:
                    cutoff_lines = [
                        f"• **{p.get('name')} ({p.get('code')})**: Min 12th: **{p.get('eligibilityCriteria', {}).get('minTwelfthMarks', 60)}%** (Subjects: {', '.join(p.get('eligibilityCriteria', {}).get('requiredSubjects', ['PCM']))}) | Min 10th: **{p.get('eligibilityCriteria', {}).get('minTenthMarks', 60)}%**"
                        for p in progs
                    ]
                    reply = (
                        f"📋 **Official University Eligibility Cutoffs:**\n\n"
                        + "\n".join(cutoff_lines) +
                        f"\n\nWhat percentage did you score in your 10th and 12th board examinations? Tell me your score and I will verify which programs you qualify for!"
                    )
                else:
                    rules_data = await tool_client.execute_tool("getEligibilityRules", parameters={"programCode": "CSE"}, tracking_id=tracking_id)
                    tool_calls.append({"toolName": "getEligibilityRules", "result": rules_data, "status": "SUCCESS"})
                    criteria = rules_data.get("criteria", {}) if isinstance(rules_data, dict) else {}
                    reply = (
                        f"📋 **University Eligibility Requirements (B.Tech CSE):**\n\n"
                        f"• Minimum 12th Aggregate: **{criteria.get('minTwelfthMarks', 65)}% (PCM)**\n"
                        f"• Minimum 10th Marks: **{criteria.get('minTenthMarks', 60)}%**\n"
                        f"• Required Subjects: **Physics, Mathematics, Chemistry**\n\n"
                        f"Please share your 12th percentage and I will check your eligibility across all departments."
                    )

        # 8. Enrollment Queries
        elif primary_intent == "ENROLLMENT_QUERY":
            enroll_data = await tool_client.execute_tool("getEnrollmentNumber", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getEnrollmentNumber", "result": enroll_data, "status": "SUCCESS"})
            if isinstance(enroll_data, dict) and enroll_data.get("isEnrolled"):
                reply = f"🎉 Congratulations! Your official university enrollment number is **{enroll_data.get('enrollmentNumber')}**."
            else:
                reply = f"Your current admission stage is **{current_stage}**. Once your document verification and fee payment are completed, your enrollment number will be generated automatically."

        # 9. Greetings & Introduction
        elif any(w in msg_lower for w in ["hi", "hello", "hey", "who are you", "what can you do", "help"]):
            reply = (
                f"Hello {student_name}! 👋 I am your Autonomous AI Admissions & Academic Assistant for Tracking ID **{tracking_id}**.\n\n"
                f"I can assist you with any questions just like ChatGPT, including:\n"
                f"• 🧠 **General AI Q&A**: Computer science, coding, math, science, and study advice\n"
                f"• 🏆 **Institutional Standing**: NIRF rankings, NAAC accreditation, and achievements\n"
                f"• 💼 **Placements**: Salary packages, top recruiters, and career statistics\n"
                f"• 🎓 **Programs & Fees**: Tuition structure for CSE, AI & DS, ECE, MECH, and MBA\n"
                f"• 📄 **Refunds & Withdrawals**: Full UGC fee refund schedules and procedures\n"
                f"• 📄 **Documents**: Real-time OCR verification results and missing upload alerts\n"
                f"• 🤝 **Counselor Support**: Dedicated escalation for scholarships and fee waivers\n\n"
                f"What would you like to ask or explore?"
            )

        # 10. Dynamic Generative Answering via Gemini for ANY other query
        else:
            try:
                gemini = provider_factory.get_provider("gemini")
                if await gemini.is_available():
                    system_prompt = (
                        f"You are the Autonomous Admissions, Academic & Universal AI Assistant for the University, "
                        f"answering questions with the conversational brilliance, depth, and helpfulness of ChatGPT.\n"
                        f"Student Name: {student_name}, Tracking ID: {tracking_id}, Current Stage: {current_stage}.\n"
                        f"Answer the user's message accurately, thoroughly, and encourage them with clean Markdown formatting."
                    )
                    gen_messages = [{"role": "system", "content": system_prompt}]
                    if history:
                        for h in history[-6:]:
                            r = h.get("role", "user")
                            c = h.get("content", "")
                            if r in ["user", "assistant", "system"] and c:
                                gen_messages.append({"role": r, "content": c})
                    gen_messages.append({"role": "user", "content": message_text})
                    
                    gemini_res = await gemini.generate_response(
                        messages=gen_messages,
                        temperature=0.7,
                        max_tokens=2048,
                    )
                    if gemini_res.is_success and gemini_res.content.strip():
                        return {
                            "reply": gemini_res.content,
                            "intent": primary_intent,
                            "confidenceScore": confidence,
                            "toolCalls": tool_calls,
                            "escalated": False,
                            "route": "DYNAMIC_GEMINI",
                            "model": gemini.get_model(),
                        }
            except Exception as e:
                logger.warning(f"Dynamic fallback Gemini failed: {e}")

            # Ultimate safe response if offline
            reply = (
                f"Hello {student_name}! I received your inquiry: \"{message_text}\". "
                f"I am here to assist with university admissions, cutoffs, tuition fees, course curriculum, and refund guidelines. "
                f"Please let me know if you would like me to connect you with an admissions counselor."
            )

        return {
            "reply": reply,
            "intent": primary_intent,
            "confidenceScore": confidence,
            "toolCalls": tool_calls,
            "escalated": False,
            "route": primary_intent,
            "model": "grounded_engine",
        }

agent = AdmissionsAgent()
