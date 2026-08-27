from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ProviderResponse(BaseModel):
    content: str
    model_name: str
    provider_name: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    raw_response: Optional[Dict[str, Any]] = None
    is_success: bool = True
    error_message: Optional[str] = None

class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the unique name of the provider (e.g., 'openai', 'gemini')"""
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        tools: Optional[List[Dict[str, Any]]] = None,
        max_tokens: Optional[int] = 1024,
    ) -> ProviderResponse:
        """Generates a conversational response from the underlying model provider."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Returns True if the provider is configured and reachable."""
        pass
