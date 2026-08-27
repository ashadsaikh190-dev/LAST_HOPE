import logging
import httpx
from typing import List, Dict, Any, Optional
from config import settings
from .base import BaseLLMProvider, ProviderResponse

logger = logging.getLogger("admissions_agent.gemini")

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.GEMINI_MODEL or "gemini-3.6-flash"

    @property
    def provider_name(self) -> str:
        return "gemini"

    def get_api_key(self) -> str:
        return self._api_key or settings.GEMINI_API_KEY

    def get_model(self) -> str:
        return self._model or settings.GEMINI_MODEL or "gemini-3.6-flash"

    async def is_available(self) -> bool:
        key = self.get_api_key()
        return bool(key and key.strip())

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        tools: Optional[List[Dict[str, Any]]] = None,
        max_tokens: Optional[int] = 1024,
    ) -> ProviderResponse:
        key = self.get_api_key()
        model = self.get_model()

        if not key or not key.strip():
            return ProviderResponse(
                content="",
                model_name=model,
                provider_name=self.provider_name,
                is_success=False,
                error_message="Gemini API Key is not configured in environment.",
            )

        # Separate system message if provided
        system_instruction = None
        contents = []

        for m in messages:
            role = m.get("role", "user")
            text = m.get("content", "")
            if not text:
                continue

            if role == "system":
                system_instruction = {"parts": [{"text": text}]}
            elif role in ["user", "human"]:
                contents.append({"role": "user", "parts": [{"text": text}]})
            elif role in ["assistant", "model", "ai"]:
                contents.append({"role": "model", "parts": [{"text": text}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens or 1024,
            }
        }
        if system_instruction:
            payload["systemInstruction"] = system_instruction

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key.strip()}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_output = "".join([p.get("text", "") for p in parts]).strip()
                        return ProviderResponse(
                            content=text_output,
                            model_name=model,
                            provider_name=self.provider_name,
                            is_success=True,
                            raw_response=data,
                        )
                    return ProviderResponse(
                        content="",
                        model_name=model,
                        provider_name=self.provider_name,
                        is_success=False,
                        error_message="Empty candidate response from Gemini API.",
                    )
                else:
                    err_text = res.text
                    logger.warning(f"Gemini API returned error ({res.status_code}): {err_text}")
                    return ProviderResponse(
                        content="",
                        model_name=model,
                        provider_name=self.provider_name,
                        is_success=False,
                        error_message=f"Gemini API error {res.status_code}: {err_text}",
                    )
        except Exception as e:
            logger.exception(f"Gemini request exception: {e}")
            return ProviderResponse(
                content="",
                model_name=model,
                provider_name=self.provider_name,
                is_success=False,
                error_message=str(e),
            )
