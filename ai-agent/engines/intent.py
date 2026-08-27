import re

class IntentEngine:
    # Higher priority value = wins over lower-priority intents when ambiguous
    INTENT_PATTERNS = {
        "FEE_WAIVER_REQUEST": {
            "priority": 100,
            "patterns": [
                r"waiver", r"waive", r"financial aid", r"cannot afford", r"can't afford",
                r"poor", r"concession", r"discount", r"scholarship request", r"fee reduction"
            ]
        },
        "REFUND_INQUIRY": {
            "priority": 88,
            "patterns": [
                r"refund", r"money back", r"cancel admission", r"withdraw admission",
                r"cancellation policy", r"fee refund", r"return money", r"cancel my seat"
            ]
        },
        "FEE_INQUIRY": {
            "priority": 82,
            "patterns": [
                r"fee", r"cost", r"tuition", r"expense", r"payment", r"how much", r"scholarship"
            ]
        },
        "PROGRAM_DISCOVERY": {
            "priority": 70,
            "patterns": [
                r"program", r"course", r"branch", r"cse", r"b\.tech", r"mba", r"degree", r"curriculum"
            ]
        },
        "ELIGIBILITY_QUERY": {
            "priority": 84,
            "patterns": [
                r"eligi", r"elligi", r"cutoff", r"cut-off", r"cut off",
                r"marks required", r"percentage required", r"percentage needed",
                r"criteria", r"qualify", r"qualifying", r"min marks", r"minimum marks",
                r"12th", r"10th", r"board", r"percentage", r"marks",
                r"can i get admission", r"am i eligible", r"can i apply", r"still eligible", r"still elligible"
            ]
        },
        "DOCUMENT_STATUS": {
            "priority": 75,
            "patterns": [
                r"document", r"marksheet", r"aadhaar", r"verify", r"verified", r"upload", r"certificate", r"ocr"
            ]
        },
        "DOCUMENT_REPLACEMENT": {
            "priority": 85,
            "patterns": [
                r"wrong document", r"replace", r"re-upload", r"uploaded wrong", r"mistake in marksheet"
            ]
        },
        "ADMISSION_STATUS": {
            "priority": 78,
            "patterns": [
                r"admission status", r"offer letter", r"selected", r"approved", r"when will I get admission"
            ]
        },
        "ENROLLMENT_QUERY": {
            "priority": 72,
            "patterns": [
                r"enrollment", r"enrollment number", r"roll number", r"student id card", r"am I enrolled"
            ]
        },
        "COUNSELOR_REQUEST": {
            "priority": 90,
            "patterns": [
                r"human", r"counselor", r"talk to someone", r"speak to person", r"representative", r"helpdesk"
            ]
        },
        "COMPLAINT": {
            "priority": 88,
            "patterns": [
                r"complaint", r"frustrated", r"terrible", r"not working", r"cheat", r"delay"
            ]
        },
    }

    def detect_intent(self, text: str) -> dict:
        clean = text.lower().strip()
        matched_intents = []

        for intent, config in self.INTENT_PATTERNS.items():
            for pattern in config["patterns"]:
                if re.search(pattern, clean):
                    matched_intents.append({
                        "intent": intent,
                        "priority": config["priority"]
                    })
                    break

        if not matched_intents:
            return {
                "primaryIntent": "GENERAL_QUERY",
                "allIntents": [],
                "confidence": 0.75,
            }

        # Sort by priority descending — highest priority wins when multiple intents match
        matched_intents.sort(key=lambda x: x["priority"], reverse=True)

        primary_intent = matched_intents[0]["intent"]
        confidence = 0.92 if len(matched_intents) == 1 else 0.87

        return {
            "primaryIntent": primary_intent,
            "allIntents": [m["intent"] for m in matched_intents],
            "confidence": confidence,
        }

intent_engine = IntentEngine()
