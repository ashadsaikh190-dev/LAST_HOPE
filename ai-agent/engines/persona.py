class PersonaEngine:
    def evaluate_persona_update(self, current_persona: dict, message: str, intent_data: dict) -> dict:
        intent = intent_data.get("primaryIntent", "")
        updates = {}

        if intent == "FEE_WAIVER_REQUEST":
            updates["feeConcern"] = "HIGH_CONCERN"
            updates["majorConcern"] = "FINANCIAL_AID"
        elif intent == "FEE_INQUIRY":
            updates["feeConcern"] = "SCHOLARSHIP_SEEKER"

        if intent in ["DOCUMENT_STATUS", "DOCUMENT_REPLACEMENT", "ELIGIBILITY_QUERY"]:
            updates["intentLevel"] = "VERY_HIGH"
            updates["engagementLevel"] = "PROACTIVE"

        if intent == "COMPLAINT":
            updates["engagementLevel"] = "RESPONSIVE"
            updates["majorConcern"] = "PROCESS_FRICTION"

        return updates

persona_engine = PersonaEngine()
