import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PORT: int = int(os.getenv("PORT", "8000"))
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    AI_SECRET_KEY: str = os.getenv("AI_SECRET_KEY", "ai_internal_token_secret_key_2026")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    ESCALATION_CONFIDENCE_THRESHOLD: float = 0.70

settings = Settings()
