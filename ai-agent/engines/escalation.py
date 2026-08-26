class EscalationEngine:
    def should_escalate(self, intent: str, confidence: float, student_profile: dict) -> dict:
        """
        Determines whether the inquiry requires counselor intervention
        """
        if intent == "FEE_WAIVER_REQUEST":
            return {
                "mustEscalate": True,
                "category": "FEE_WAIVER",
                "priority": "HIGH",
                "reason": "Special fee waiver and financial concession requests require human institutional committee evaluation.",
                "recommendedAction": "Review student family income certificate and academic merit scores.",
            }

        if intent == "COUNSELOR_REQUEST":
            return {
                "mustEscalate": True,
                "category": "HUMAN_REQUEST",
                "priority": "MEDIUM",
                "reason": "Student explicitly requested conversation with a human counselor.",
                "recommendedAction": "Initiate counselor call or direct chat outreach.",
            }

        if intent == "COMPLAINT":
            return {
                "mustEscalate": True,
                "category": "COMPLAINT",
                "priority": "HIGH",
                "reason": "Student expressed frustration or grievance with admission workflow.",
                "recommendedAction": "Expedite document review and resolve student roadblock.",
            }

        if confidence < 0.65:
            return {
                "mustEscalate": True,
                "category": "LOW_AI_CONFIDENCE",
                "priority": "MEDIUM",
                "reason": "AI confidence fell below safety threshold for complex student question.",
                "recommendedAction": "Answer student's query and update institutional knowledge base.",
            }

        return {"mustEscalate": False}

    def generate_case_summary(self, tracking_id: str, student_name: str, program_name: str, reason: str, recommended_action: str) -> str:
        return f"Student {student_name} ({tracking_id}) applying for {program_name} escalated due to: {reason}. Recommended action: {recommended_action}."

escalation_engine = EscalationEngine()
