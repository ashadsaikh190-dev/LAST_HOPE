"""
JSON Tool Definitions for LLM Function Calling
"""

AI_TOOLS = [
    {
        "name": "getStudentProfile",
        "description": "Retrieves the full profile of the student including academic scores, contact info, and current stage.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getPrograms",
        "description": "Retrieves the list of active university academic programs, eligibility cutoffs, and fees.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getProgramDetails",
        "description": "Retrieves details, fees, and requirements for a specific program code or name.",
        "parameters": {
            "type": "object",
            "properties": {
                "programCode": {"type": "string", "description": "e.g. CSE, AI_DS, MBA"},
            },
            "required": ["programCode"],
        },
    },
    {
        "name": "getApplication",
        "description": "Retrieves the student's current submitted admission application.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getRequiredDocuments",
        "description": "Gets the list of documents required for the student's selected program.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getMissingDocuments",
        "description": "Checks which required documents have not yet been uploaded or verified.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getVerificationStatus",
        "description": "Retrieves OCR Textract verification results and mismatch details for all uploaded documents.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "checkEligibility",
        "description": "Evaluates candidate marks against program cutoff rules.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getPaymentStatus",
        "description": "Checks whether application/tuition fees have been paid or if payment is pending.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getAdmissionStatus",
        "description": "Retrieves the institutional admission decision or provisional offer status.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getEnrollmentNumber",
        "description": "Retrieves the official generated student enrollment number if issued.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "createCounselorEscalation",
        "description": "Escalates a complex query, fee waiver request, special accommodation, or complaint to a human admissions counselor.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": [
                        "FEE_WAIVER",
                        "POLICY_EXCEPTION",
                        "DOCUMENT_AMBIGUITY",
                        "LOW_AI_CONFIDENCE",
                        "PAYMENT_DISPUTE",
                        "SPECIAL_ACCOMMODATION",
                        "COMPLAINT",
                        "HUMAN_REQUEST",
                    ],
                },
                "summary": {"type": "string"},
                "reason": {"type": "string"},
                "recommendedAction": {"type": "string"},
            },
            "required": ["category", "summary", "reason", "recommendedAction"],
        },
    },
]

def get_openai_tools():
    """Convert AI_TOOLS into OpenAI function calling schema"""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            }
        }
        for t in AI_TOOLS
    ]
