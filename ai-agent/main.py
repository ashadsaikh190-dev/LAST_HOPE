from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from config import settings
from core.agent import agent
from engines.intent import intent_engine
from engines.persona import persona_engine
from engines.escalation import escalation_engine
from engines.action import action_engine

app = FastAPI(
    title="Autonomous Admissions & Lifecycle AI Agent",
    version="1.0.0",
    description="Intelligent Conversational Admissions Agent with Autonomous Tool Calling & Escalation Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    trackingId: str
    studentId: Optional[str] = None
    message: str
    conversationId: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class IntentRequest(BaseModel):
    text: str

class PersonaRequest(BaseModel):
    currentPersona: Dict[str, Any]
    message: str
    intentData: Dict[str, Any]

class CaseSummaryRequest(BaseModel):
    trackingId: str
    studentName: str
    programName: str
    reason: str
    recommendedAction: str

class NextActionRequest(BaseModel):
    currentStage: str
    hasMissingDocs: bool = False
    eligibilityStatus: str = "PENDING"
    paymentCompleted: bool = False

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "autonomous-admissions-ai-agent",
        "version": "1.0.0",
        "engine": "FastAPI + Autonomous Agent Core",
    }

@app.post("/ai/chat")
async def chat_endpoint(req: ChatRequest, x_ai_secret_key: Optional[str] = Header(None)):
    if x_ai_secret_key and x_ai_secret_key != settings.AI_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid AI Secret Key")

    result = await agent.process_student_message(
        tracking_id=req.trackingId,
        student_id=req.studentId or "",
        message_text=req.message,
        conversation_id=req.conversationId,
        history=req.history,
    )
    return result

@app.post("/ai/analyze-intent")
def analyze_intent_endpoint(req: IntentRequest):
    return intent_engine.detect_intent(req.text)

@app.post("/ai/generate-persona")
def generate_persona_endpoint(req: PersonaRequest):
    return persona_engine.evaluate_persona_update(
        req.currentPersona, req.message, req.intentData
    )

@app.post("/ai/summarize-case")
def summarize_case_endpoint(req: CaseSummaryRequest):
    summary = escalation_engine.generate_case_summary(
        req.trackingId, req.studentName, req.programName, req.reason, req.recommendedAction
    )
    return {"summary": summary}

@app.post("/ai/route-query")
def route_query_endpoint(req: IntentRequest):
    from router.semantic_router import query_router
    decision = query_router.route_query(req.text)
    return decision.model_dump()

@app.post("/ai/decide-next-action")
def decide_next_action_endpoint(req: NextActionRequest):
    return action_engine.decide_next_action(
        req.currentStage, req.hasMissingDocs, req.eligibilityStatus, req.paymentCompleted
    )

@app.post("/ai/process-conversation")
async def process_conversation_endpoint(req: ChatRequest):
    return await agent.process_student_message(
        tracking_id=req.trackingId,
        student_id=req.studentId or "",
        message_text=req.message,
        history=req.history,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
