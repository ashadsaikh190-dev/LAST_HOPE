import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PORT: int = int(os.getenv("PORT", "8000"))
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    AI_SECRET_KEY: str = os.getenv("AI_SECRET_KEY", "ai_internal_token_secret_key_2026")
    
    # OpenAI / Primary LLM Configuration
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))
    
    # Google Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_TEMPERATURE: float = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    
    # Semantic Routing & Thresholds
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    ROUTER_CONFIDENCE_THRESHOLD: float = float(os.getenv("ROUTER_CONFIDENCE_THRESHOLD", "0.75"))
    ESCALATION_CONFIDENCE_THRESHOLD: float = float(os.getenv("ESCALATION_CONFIDENCE_THRESHOLD", "0.70"))

settings = Settings()
