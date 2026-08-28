import logging
from typing import List, Dict, Any, Optional

from tools.backend_tools import tool_client
from engines.intent import intent_engine
from engines.persona import persona_engine
from engines.escalation import escalation_engine
from router.semantic_router import query_router
from core.gemini_agent import gemini_agent

logger = logging.getLogger("admissions_agent")

class AdmissionsAgent:
    """
    Autonomous Admissions Agent Orchestrator
    - Primary Reasoning & Conversation: Google Gemini LLM with Function Calling
    - Live Tool Execution: Node.js Express API & MongoDB
    - Background Telemetry: Semantic routing, Intent & Persona analytics
    """

    async def process_student_message(
        self,
        tracking_id: str,
        student_id: str = "",
        message_text: str = "",
        conversation_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        clean_text = (message_text or "").strip()
        if not clean_text:
            return {
                "reply": "Hello! How can I help you today with your admissions, programs, eligibility, or general questions?",
                "intent": "GREETING",
                "confidenceScore": 1.0,
                "toolCalls": [],
                "escalated": False,
                "route": "GREETING",
                "model": "gemini-2.5-flash",
            }

        # Step 1: Load student profile context from backend database
        student_profile = {}
        try:
            student_profile = await tool_client.execute_tool("getStudentProfile", tracking_id=tracking_id)
            if not isinstance(student_profile, dict) or student_profile.get("error"):
                student_profile = {}
        except Exception as e:
            logger.warning(f"Could not load student profile for {tracking_id}: {e}")

        # Step 2: Background Intent & Telemetry (does not block Gemini reasoning)
        intent_result = intent_engine.detect_intent(clean_text)
        detected_intent = intent_result.get("primaryIntent", "GENERAL_QUERY")
        confidence = intent_result.get("confidence", 0.90)

        # Step 3: Execute Primary Gemini Autonomous Agent with Function Calling
        gemini_result = await gemini_agent.process_message(
            tracking_id=tracking_id,
            student_id=student_id,
            message_text=clean_text,
            student_profile=student_profile,
            history=history,
        )

        reply = gemini_result.get("reply", "")
        tool_calls = gemini_result.get("toolCalls", [])
        is_escalated = gemini_result.get("escalated", False)
        model_name = gemini_result.get("model", "gemini-2.5-flash")

        # Step 4: Persona & Escalation telemetry evaluation
        try:
            if is_escalated:
                detected_intent = "COUNSELOR_REQUEST"
        except Exception as e:
            logger.debug(f"Telemetry update error: {e}")

        logger.info(
            f"[Agent Completed] TrackingID={tracking_id} | Intent={detected_intent} | "
            f"ToolsExecuted={len(tool_calls)} | Escalated={is_escalated} | Model={model_name}"
        )

        return {
            "reply": reply,
            "intent": detected_intent,
            "confidenceScore": confidence,
            "toolCalls": tool_calls,
            "escalated": is_escalated,
            "route": detected_intent,
            "model": model_name,
        }

agent = AdmissionsAgent()
