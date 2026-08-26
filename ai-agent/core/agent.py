from engines.intent import intent_engine
from engines.escalation import escalation_engine
from engines.persona import persona_engine
from tools.backend_tools import tool_client

class AdmissionsAgent:
    async def process_student_message(self, tracking_id: str, student_id: str, message_text: str, conversation_id: str = None) -> dict:
        # 1. Detect Intent
        intent_result = intent_engine.detect_intent(message_text)
        primary_intent = intent_result["primaryIntent"]
        confidence = intent_result["confidence"]

        # 2. Retrieve real student profile
        student_profile = await tool_client.execute_tool("getStudentProfile", tracking_id=tracking_id)
        student_name = student_profile.get("name", "Student")
        current_stage = student_profile.get("currentStage", "REGISTERED")
        selected_program = student_profile.get("selectedProgram", "General Admissions")

        tool_calls = []
        reply = ""

        # 3. Check for mandatory counselor escalation
        escalation_check = escalation_engine.should_escalate(primary_intent, confidence, student_profile)

        if escalation_check["mustEscalate"]:
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
                    f"Because financial aid requires human policy review, I have created counselor review case **{case_id}**. "
                    f"Our admissions committee will inspect your submitted documents."
                )
            elif primary_intent == "COUNSELOR_REQUEST":
                reply = f"I have notified our admissions counseling desk (**Case: {case_id}**). An admissions advisor will connect with you shortly."
            else:
                reply = f"Your inquiry has been escalated to a senior admissions counselor (**Case: {case_id}**) for dedicated support."

            return {
                "reply": reply,
                "intent": primary_intent,
                "confidenceScore": confidence,
                "toolCalls": tool_calls,
                "escalated": True,
            }

        # 4. Handle Routine Admissions Queries via Real Backend Tools
        if primary_intent in ["FEE_INQUIRY", "PROGRAM_DISCOVERY"]:
            programs_data = await tool_client.execute_tool("getPrograms", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getPrograms", "result": programs_data, "status": "SUCCESS"})
            
            progs = programs_data if isinstance(programs_data, list) else programs_data.get("data", []) if isinstance(programs_data, dict) else []
            
            # Check if user specifically mentioned a program code or keyword
            msg_upper = message_text.upper()
            matched_prog = None
            if isinstance(progs, list):
                for p in progs:
                    code = str(p.get("code", "")).upper()
                    name = str(p.get("name", "")).upper()
                    dept = str(p.get("department", "")).upper()
                    if (code and code in msg_upper) or (code == "CSE" and "COMPUTER" in msg_upper) or (code == "AI_DS" and ("AI" in msg_upper or "DATA SCIENCE" in msg_upper)) or (code == "MBA" and "MANAGEMENT" in msg_upper):
                        matched_prog = p
                        break
            
            if matched_prog:
                tuition = matched_prog.get("tuitionFee", 0)
                app_fee = matched_prog.get("applicationFee", 1000)
                duration = matched_prog.get("durationYears", 4)
                min_12 = matched_prog.get("eligibilityCriteria", {}).get("minTwelfthMarks", 60)
                min_10 = matched_prog.get("eligibilityCriteria", {}).get("minTenthMarks", 60)
                seats = matched_prog.get("seatCapacity", 120)
                
                reply = (
                    f"The official fee schedule for **{matched_prog.get('name')} ({matched_prog.get('code')})** is:\n\n"
                    f"• **Annual Tuition Fee**: **₹{tuition:,} / year**\n"
                    f"• **One-Time Application Fee**: **₹{app_fee:,}**\n"
                    f"• **Total Program Tuition ({duration} Years)**: **₹{tuition * duration:,}**\n\n"
                    f"📋 **Eligibility & Intake Criteria:**\n"
                    f"• Minimum 12th Board Marks: **{min_12}% (PCM)**\n"
                    f"• Minimum 10th Board Marks: **{min_10}%**\n"
                    f"• Total Approved Seats: **{seats} Seats**\n\n"
                    f"You can apply directly from your portal or upload your income certificate to check for merit scholarship fee waivers."
                )
            elif isinstance(progs, list) and len(progs) > 0:
                prog_list = "\n".join([f"- **{p.get('name')} ({p.get('code')})**: Tuition ₹{p.get('tuitionFee', 0):,}/yr | Duration: {p.get('durationYears', 4)} yrs | Min 12th: {p.get('eligibilityCriteria', {}).get('minTwelfthMarks', 50)}%" for p in progs])
                reply = f"Here are the active university degree programs and tuition fees:\n\n{prog_list}\n\nWould you like more details on a specific program like **CSE**, **AI & Data Science**, or **MBA**?"
            else:
                reply = "Our university offers accredited B.Tech and MBA degrees. Annual tuition ranges from ₹85,000 to ₹1,40,000 per year."

        elif primary_intent == "DOCUMENT_STATUS":
            verif_data = await tool_client.execute_tool("getVerificationStatus", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getVerificationStatus", "result": verif_data, "status": "SUCCESS"})
            
            if isinstance(verif_data, list) and len(verif_data) > 0:
                verif_summary = "\n".join([f"- **{v.get('documentType')}**: {v.get('status')} (Confidence: {v.get('confidenceScore', 0)}%)" for v in verif_data])
                reply = f"Here is the real-time status of your documents:\n\n{verif_summary}"
            else:
                missing_data = await tool_client.execute_tool("getMissingDocuments", tracking_id=tracking_id)
                tool_calls.append({"toolName": "getMissingDocuments", "result": missing_data, "status": "SUCCESS"})
                missing = missing_data.get("missingDocuments", [])
                reply = f"You have not completed document verification yet. Pending uploads: {', '.join(missing) if missing else '10th & 12th marksheets, Identity proof'}."

        elif primary_intent == "ELIGIBILITY_QUERY":
            rules_data = await tool_client.execute_tool("getEligibilityRules", parameters={"programCode": "CSE"}, tracking_id=tracking_id)
            tool_calls.append({"toolName": "getEligibilityRules", "result": rules_data, "status": "SUCCESS"})
            criteria = rules_data.get("criteria", {})
            reply = f"For **{rules_data.get('program', 'B.Tech CSE')}**, the eligibility requirements are:\n- Minimum 10th Marks: **{criteria.get('minTenthMarks', 60)}%**\n- Minimum 12th Aggregate: **{criteria.get('minTwelfthMarks', 65)}%**\n- Required Subjects: **{', '.join(criteria.get('requiredSubjects', ['Physics', 'Math']))}**."

        elif primary_intent == "ENROLLMENT_QUERY":
            enroll_data = await tool_client.execute_tool("getEnrollmentNumber", tracking_id=tracking_id)
            tool_calls.append({"toolName": "getEnrollmentNumber", "result": enroll_data, "status": "SUCCESS"})
            if enroll_data.get("isEnrolled"):
                reply = f"Congratulations! Your official university enrollment number is **{enroll_data.get('enrollmentNumber')}**."
            else:
                reply = f"Your current admission stage is **{current_stage}**. Once your document verification and admission approval are finalized, your enrollment number will be issued automatically."

        else:
            reply = (
                f"Hello {student_name}! I am your Autonomous Admissions Assistant for Tracking ID **{tracking_id}**. "
                f"I can assist you with checking program fees, inspecting OCR verification results, explaining cutoff requirements, or scheduling a counselor review. How can I help?"
            )

        return {
            "reply": reply,
            "intent": primary_intent,
            "confidenceScore": confidence,
            "toolCalls": tool_calls,
            "escalated": False,
        }

agent = AdmissionsAgent()
