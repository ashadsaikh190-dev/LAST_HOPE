import logging
import asyncio
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from config import settings
from tools.definitions import get_gemini_tools
from tools.backend_tools import tool_client

logger = logging.getLogger("admissions_agent.gemini_core")

class GeminiAdmissionsAgent:
    """
    Autonomous Gemini-Powered University Admissions Agent
    - Uses Google GenAI SDK with native Function Calling
    - Multi-turn conversational memory & student context
    - Grounded live backend tool execution (MongoDB via Express API)
    - Zero rule-based templates for standard conversational reasoning
    - Resilient multi-model fallback (Gemini 2.5 Flash -> Gemma 4 31B)
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None
        self._primary_model = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._tool_models = [self._primary_model, "gemini-flash-latest"]
        self._conversational_fallback_models = ["gemma-4-31b-it", "gemma-4-26b-a4b-it"]

    def _get_client(self) -> Optional[genai.Client]:
        key = settings.GEMINI_API_KEY
        if not key or not key.strip():
            logger.error("GEMINI_API_KEY is not configured in environment.")
            return None
        if self._client is None:
            self._client = genai.Client(api_key=key.strip())
        return self._client

    def _build_system_instruction(
        self,
        student_name: str,
        tracking_id: str,
        current_stage: str,
        selected_program: str,
        student_profile: Dict[str, Any],
    ) -> str:
        academic_info = student_profile.get("academicProfile", {}) if isinstance(student_profile, dict) else {}
        twelfth_pct = academic_info.get("twelfthMarks", {}).get("percentage", "Not Uploaded")
        tenth_pct = academic_info.get("tenthMarks", {}).get("percentage", "Not Uploaded")

        return (
            f"You are the Autonomous AI Admissions & Academic Counselor for GIET University (Gandhi Institute of Engineering and Technology, Gunupur, Odisha).\n"
            f"You possess the conversational intelligence, depth, clarity, empathy, and adaptability of ChatGPT and Gemini.\n\n"
            f"### Active Student Context:\n"
            f"- Student Name: {student_name}\n"
            f"- Tracking ID: {tracking_id}\n"
            f"- Current Admission Stage: {current_stage}\n"
            f"- Selected / Applied Program: {selected_program}\n"
            f"- 12th Board Marks: {twelfth_pct}%\n"
            f"- 10th Board Marks: {tenth_pct}%\n\n"
            f"### GIET University Key Profile:\n"
            f"- Institution: GIET University, Gunupur, Rayagada, Odisha - 765022 (120-acre lush green campus)\n"
            f"- Rankings & Accreditations: NAAC A++ (CGPA 3.78/4.0), NIRF Top 35 Engineering, NBA Tier-1 Accredited, AICTE approved\n"
            f"- Programs: B.Tech (CSE, AI & DS, ECE, Mechanical, EE), M.Tech, MBA, MCA, BCA, BBA, Ph.D.\n"
            f"- Fees: CSE/AI&DS tuition ₹1,20,000/yr; ECE ₹95,000/yr; MECH ₹85,000/yr; MBA ₹90,000/yr. Hostel: ₹65,000 - ₹95,000/yr with mess.\n"
            f"- Placements: 96.4% placement rate, ₹54.2 LPA highest package, ₹11.8 LPA average (CSE), top recruiters Google, Microsoft, Amazon, Deloitte, TCS.\n"
            f"- Facilities: 50m Olympic swimming pool, floodlit cricket stadium, multi-court indoor badminton arena, modern AC gyms, 24/7 digital library.\n"
            f"- Admissions Helpline: +91 6857 250172 | admissions@giet.edu | https://www.giet.edu\n\n"
            f"### Core Counselor Directives:\n"
            f"1. **Conversational Intelligence**: You are NOT a rigid FAQ chatbot. You understand any question, grammar variation, typo, or open-ended reasoning naturally.\n"
            f"2. **General Knowledge**: Answer general questions (e.g. 'What is machine learning?', 'Difference between CSE and ECE', 'How should I prepare for college?', coding, math, study tips) directly using your own reasoning.\n"
            f"3. **Authoritative University Facts & Tools**: Whenever the student asks about university programs, fees, eligibility criteria, document verification, missing documents, payment status, scholarships, enrollment numbers, or university facts, use available tools or verified university records.\n"
            f"4. **No Hallucination**: Never invent university fees, cutoffs, or student statuses. If specific information is unavailable, state so honestly.\n"
            f"5. **Human Escalations**: If the student requests a human counselor, has a complex fee waiver / hardship request, or files a complaint, call `createCounselorEscalation`.\n"
            f"6. **Tone & Style**: Direct, friendly, encouraging, and structured using clean Markdown (bullet points, bold text). Avoid robotic generic intro templates like 'Hello Student! I received your inquiry'—answer directly and helpfully.\n"
            f"7. **Proactive Guidance**: Guide students on their next steps (e.g. uploading missing marksheets, verifying eligibility, completing payment) to reduce counselor workload."
        )

    def _format_history_contents(
        self,
        history: Optional[List[Dict[str, str]]],
        current_message: str,
    ) -> List[types.Content]:
        contents: List[types.Content] = []
        if history and isinstance(history, list):
            for item in history[-8:]:
                role = item.get("role", "user")
                text = item.get("content", "")
                if not text or not text.strip():
                    continue
                sdk_role = "model" if role in ["assistant", "model", "ai"] else "user"
                contents.append(
                    types.Content(
                        role=sdk_role,
                        parts=[types.Part.from_text(text=text.strip())],
                    )
                )

        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=current_message.strip())],
            )
        )
        return contents

    async def process_message(
        self,
        tracking_id: str,
        student_id: str = "",
        message_text: str = "",
        student_profile: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Main autonomous reasoning cycle with multi-step tool execution.
        """
        client = self._get_client()
        if not client:
            return {
                "reply": "The Admissions AI service is currently configuring its credentials. Please check back in a moment.",
                "toolCalls": [],
                "escalated": False,
                "model": "offline",
                "isSuccess": False,
            }

        student_name = "Student"
        current_stage = "REGISTERED"
        selected_program = "General Admissions"
        if student_profile and isinstance(student_profile, dict):
            student_name = student_profile.get("name", "Student")
            current_stage = student_profile.get("currentStage", "REGISTERED")
            selected_program = student_profile.get("selectedProgram", "General Admissions")

        system_instruction = self._build_system_instruction(
            student_name=student_name,
            tracking_id=tracking_id,
            current_stage=current_stage,
            selected_program=selected_program,
            student_profile=student_profile or {},
        )

        gemini_tools = get_gemini_tools()
        contents = self._format_history_contents(history, message_text)

        tool_calls_executed = []
        is_escalated = False
        final_text = ""
        active_model = self._primary_model

        # Phase 1: Try Primary Gemini Function Calling Models
        function_calling_succeeded = False
        for model_name in self._tool_models:
            for retry in range(2):
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        tools=gemini_tools,
                        temperature=0.7,
                    )
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                    active_model = model_name

                    # Function Calling Loop (up to 4 turns for chained tool execution)
                    for turn in range(4):
                        function_calls = response.function_calls
                        if not function_calls:
                            final_text = response.text or ""
                            function_calling_succeeded = True
                            break

                        # Append model's tool call turn to contents
                        if response.candidates and response.candidates[0].content:
                            contents.append(response.candidates[0].content)

                        # Execute requested tool calls asynchronously
                        for f_call in function_calls:
                            fn_name = f_call.name
                            fn_args = f_call.args or {}
                            clean_args = {k: v for k, v in fn_args.items()} if isinstance(fn_args, dict) else {}

                            logger.info(f"[Gemini Tool Call] '{fn_name}' with {clean_args}")
                            tool_res = await tool_client.execute_tool(
                                tool_name=fn_name,
                                parameters=clean_args,
                                student_id=student_id,
                                tracking_id=tracking_id,
                            )

                            tool_calls_executed.append({
                                "toolName": fn_name,
                                "parameters": clean_args,
                                "result": tool_res,
                                "status": "SUCCESS" if not isinstance(tool_res, dict) or not tool_res.get("error") else "FAILURE",
                            })

                            if fn_name == "createCounselorEscalation":
                                is_escalated = True

                            contents.append(
                                types.Content(
                                    role="tool",
                                    parts=[
                                        types.Part.from_function_response(
                                            name=fn_name,
                                            response={"result": tool_res},
                                        )
                                    ],
                                )
                            )

                        # Send tool execution results back to Gemini for final response synthesis
                        response = await asyncio.to_thread(
                            client.models.generate_content,
                            model=model_name,
                            contents=contents,
                            config=config,
                        )

                    if function_calling_succeeded or (response and response.text):
                        final_text = final_text or response.text or ""
                        function_calling_succeeded = True
                        break
                except Exception as e:
                    err_str = str(e)
                    is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                    logger.warning(f"Tool Model {model_name} attempt {retry} failed: {e}")
                    if is_rate_limit and retry == 0:
                        await asyncio.sleep(1.5)
                    else:
                        break

            if function_calling_succeeded and final_text.strip():
                break

        # Phase 2: Fallback to Conversational High-Capacity Models (Gemma 4) if tool model rate-limited
        if not final_text.strip():
            logger.info("Engaging conversational fallback model...")
            for fallback_model in self._conversational_fallback_models:
                try:
                    fallback_config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    )
                    # Use standard user message content without tool attachments
                    simple_contents = self._format_history_contents(history, message_text)
                    fallback_res = await asyncio.to_thread(
                        client.models.generate_content,
                        model=fallback_model,
                        contents=simple_contents,
                        config=fallback_config,
                    )
                    if fallback_res and fallback_res.text:
                        final_text = fallback_res.text
                        active_model = fallback_model
                        break
                except Exception as e:
                    logger.warning(f"Conversational fallback {fallback_model} failed: {e}")

        if not final_text.strip():
            final_text = (
                f"Hello {student_name}! I am your Autonomous Admissions & Academic Counselor for GIET University. "
                f"I can help you with degree programs (CSE, AI & DS, ECE, MBA), eligibility cutoffs, tuition fees, "
                f"document verification, or connecting with an admissions officer. How may I assist you?"
            )

        return {
            "reply": final_text.strip(),
            "toolCalls": tool_calls_executed,
            "escalated": is_escalated,
            "model": active_model,
            "isSuccess": True,
        }

gemini_agent = GeminiAdmissionsAgent()
