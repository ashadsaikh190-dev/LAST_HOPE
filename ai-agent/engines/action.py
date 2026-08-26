class ActionEngine:
    def decide_next_action(self, current_stage: str, has_missing_docs: bool, eligibility_status: str, payment_completed: bool) -> dict:
        """
        Determines the next best autonomous activity for the student lifecycle
        """
        if current_stage == "REGISTERED":
            return {
                "action": "DISCOVER_PROGRAMS",
                "message": "Explore our academic programs and select your preferred engineering or management degree.",
            }

        if current_stage == "APPLICATION_STARTED" or current_stage == "LEAD":
            return {
                "action": "COMPLETE_APPLICATION",
                "message": "Submit your personal and academic details in the Application wizard.",
            }

        if current_stage == "DOCUMENTS_PENDING" or has_missing_docs:
            return {
                "action": "UPLOAD_DOCUMENTS",
                "message": "Upload your 10th marksheet, 12th marksheet, and identity proof for OCR verification.",
            }

        if current_stage == "DOCUMENT_VERIFICATION":
            return {
                "action": "AWAIT_OCR_VERIFICATION",
                "message": "Documents are currently undergoing Textract OCR verification.",
            }

        if current_stage == "PAYMENT_PENDING" and not payment_completed:
            return {
                "action": "COMPLETE_PAYMENT",
                "message": "Complete the required application fee payment to finalize your admission review.",
            }

        if current_stage == "ADMISSION_APPROVED":
            return {
                "action": "GENERATE_ENROLLMENT",
                "message": "Your admission is approved! Access your official enrollment card.",
            }

        if current_stage == "ENROLLED":
            return {
                "action": "ONBOARDING",
                "message": "You are officially enrolled! Download your student orientation guide.",
            }

        return {
            "action": "GENERAL_GUIDANCE",
            "message": "Contact the admissions office or ask the AI Assistant if you need assistance.",
        }

action_engine = ActionEngine()
