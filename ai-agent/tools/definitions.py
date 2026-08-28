"""
JSON & Gemini Tool Definitions for LLM Function Calling
"""
from typing import List, Dict, Any
from google.genai import types

AI_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "getUniversityInfo",
        "description": "Retrieves authoritative university information including institution name, campus location, NAAC A++ accreditation, NIRF top 35 ranking, NBA approval, campus facilities (Olympic swimming pool, sports, hostels, labs), contact info, and website.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getPrograms",
        "description": "Retrieves the list of active university academic degree programs (B.Tech CSE, AI & DS, ECE, MECH, MBA, etc.), minimum eligibility cutoff percentages, and tuition fees.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getProgramDetails",
        "description": "Retrieves specific degree program details, syllabus focus, seat capacity, duration, and admission requirements for a given program code (e.g. CSE, AI_DS, MBA).",
        "parameters": {
            "type": "object",
            "properties": {
                "programCode": {"type": "string", "description": "Degree program code e.g. CSE, AI_DS, ECE, MECH, MBA"},
            },
            "required": ["programCode"],
        },
    },
    {
        "name": "getProgramFeeBreakdown",
        "description": "Retrieves a comprehensive tuition fee schedule, application fee, semester breakdown, and optional hostel charges for all programs or a specific program code.",
        "parameters": {
            "type": "object",
            "properties": {
                "programCode": {"type": "string", "description": "Optional program code e.g. CSE, AI_DS, MBA to get fee details for a specific branch"},
            },
        },
    },
    {
        "name": "getEligibilityRules",
        "description": "Retrieves official 10th and 12th board eligibility marks criteria, required subject groups (e.g. Physics, Chemistry, Math), and deadlines for a specific program.",
        "parameters": {
            "type": "object",
            "properties": {
                "programCode": {"type": "string", "description": "e.g. CSE, AI_DS, ECE, MBA"},
            },
            "required": ["programCode"],
        },
    },
    {
        "name": "calculateScholarshipEstimate",
        "description": "Calculates institutional merit, sports, or defense scholarship eligibility and estimated annual tuition discount based on candidate 12th board marks percentage and category.",
        "parameters": {
            "type": "object",
            "properties": {
                "twelfthMarks": {"type": "number", "description": "12th board marks percentage score (e.g. 85.5)"},
                "category": {
                    "type": "string",
                    "description": "Scholarship category: MERIT, SPORTS, DEFENSE, or ECONOMIC_NEED",
                },
                "programCode": {"type": "string", "description": "Target program code e.g. CSE, AI_DS"},
            },
        },
    },
    {
        "name": "getStudentProfile",
        "description": "Retrieves the authenticated student's full profile including tracking ID, contact details, academic scores (10th/12th marks), current admission stage, and assigned counselor.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getStudentStatus",
        "description": "Retrieves the student's admission checklist, pending milestones, application progress, and remaining tasks.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getApplication",
        "description": "Retrieves the student's currently submitted admission application form data and selected degree branch.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getRequiredDocuments",
        "description": "Gets the list of mandatory verification documents (Aadhaar/Identity, 10th Marksheet, 12th Marksheet, Passport Photo) required for admission.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getMissingDocuments",
        "description": "Checks which required admission documents have not yet been uploaded or are pending review for the student.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getVerificationStatus",
        "description": "Retrieves real-time OCR Textract verification status, confidence scores, and any name/score mismatch flags for uploaded documents.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "checkEligibility",
        "description": "Executes deterministic eligibility verification engine comparing student marksheets against program minimum cutoff rules.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getPaymentStatus",
        "description": "Checks the real-time status of the student's application fee or tuition fee payments.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getAdmissionStatus",
        "description": "Retrieves the formal institutional admission decision (e.g. APPROVED, UNDER_REVIEW, PROVISIONAL_OFFER).",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "getEnrollmentNumber",
        "description": "Retrieves the permanent official university enrollment number (e.g. GIET2026CSE000001) if issued.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "createCounselorEscalation",
        "description": "Escalates a complex query, fee concession request, grievance, or explicit student request to speak with a human senior admissions counselor.",
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
                    "description": "Category of human counselor escalation",
                },
                "summary": {"type": "string", "description": "Brief headline summary of student request"},
                "reason": {"type": "string", "description": "Detailed explanation of why human intervention is required"},
                "recommendedAction": {"type": "string", "description": "Recommended action for counselor desk"},
            },
            "required": ["category", "summary", "reason", "recommendedAction"],
        },
    },
]

def _convert_to_gemini_schema(param_def: Dict[str, Any]) -> types.Schema:
    p_type = param_def.get("type", "object")
    
    type_map = {
        "string": types.Type.STRING,
        "number": types.Type.NUMBER,
        "integer": types.Type.INTEGER,
        "boolean": types.Type.BOOLEAN,
        "array": types.Type.ARRAY,
        "object": types.Type.OBJECT,
    }
    gemini_type = type_map.get(p_type, types.Type.OBJECT)
    
    properties = {}
    for prop_name, prop_val in param_def.get("properties", {}).items():
        properties[prop_name] = _convert_to_gemini_schema(prop_val)
        
    enum_vals = param_def.get("enum")
    description = param_def.get("description")
    required = param_def.get("required")
    
    kwargs: Dict[str, Any] = {
        "type": gemini_type,
    }
    if properties:
        kwargs["properties"] = properties
    if enum_vals:
        kwargs["enum"] = enum_vals
    if description:
        kwargs["description"] = description
    if required:
        kwargs["required"] = required
        
    return types.Schema(**kwargs)

def get_gemini_tools() -> List[types.Tool]:
    """Convert AI_TOOLS into Google GenAI SDK Tools"""
    func_declarations = []
    for t in AI_TOOLS:
        param_schema = _convert_to_gemini_schema(t.get("parameters", {"type": "object"}))
        func_declarations.append(
            types.FunctionDeclaration(
                name=t["name"],
                description=t["description"],
                parameters=param_schema,
            )
        )
    return [types.Tool(function_declarations=func_declarations)]

def get_openai_tools() -> List[Dict[str, Any]]:
    """Convert AI_TOOLS into OpenAI function calling schema for compatibility"""
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
