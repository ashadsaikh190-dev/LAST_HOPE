import logging
import json
from typing import List, Dict, Any, Optional
import openai
from config import settings
from .base import BaseLLMProvider, ProviderResponse

logger = logging.getLogger("admissions_agent.openai")

class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key
        self._base_url = base_url
        self._model = model

    @property
    def provider_name(self) -> str:
        return "openai"

    def _get_client_and_model(self):
        api_key = (self._api_key or settings.LLM_API_KEY or "").strip()
        base_url = (self._base_url or settings.LLM_BASE_URL or "").strip() or None
        model = self._model or settings.LLM_MODEL or "gpt-4o-mini"

        if not api_key:
            return None, model

        kwargs: Dict[str, Any] = {
            "api_key": api_key,
            "timeout": 8.0,
            "max_retries": 1,
        }
        if base_url:
            kwargs["base_url"] = base_url

        return openai.AsyncOpenAI(**kwargs), model

    async def is_available(self) -> bool:
        client, _ = self._get_client_and_model()
        return client is not None

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        tools: Optional[List[Dict[str, Any]]] = None,
        max_tokens: Optional[int] = 1024,
    ) -> ProviderResponse:
        client, model = self._get_client_and_model()

        if not client:
            return ProviderResponse(
                content="",
                model_name=model,
                provider_name=self.provider_name,
                is_success=False,
                error_message="OpenAI API key is not configured.",
            )

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or 1024,
        }

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            response = await client.chat.completions.create(**kwargs)
            msg = response.choices[0].message
            tool_calls = []

            if msg.tool_calls:
                for tc in msg.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except Exception:
                        args = {}
                    tool_calls.append({
                        "id": tc.id,
                        "toolName": tc.function.name,
                        "parameters": args,
                        "raw": tc,
                    })

            return ProviderResponse(
                content=msg.content or "",
                model_name=model,
                provider_name=self.provider_name,
                tool_calls=tool_calls,
                is_success=True,
                raw_response=response.model_dump() if hasattr(response, "model_dump") else None,
            )
        except Exception as e:
            logger.warning(f"OpenAI completion error ({type(e).__name__}): {e}")
            return ProviderResponse(
                content="",
                model_name=model,
                provider_name=self.provider_name,
                is_success=False,
                error_message=str(e),
            )
