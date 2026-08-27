from typing import Dict, Optional
from .base import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .gemini_provider import GeminiProvider

class ProviderFactory:
    def __init__(self):
        self._providers: Dict[str, BaseLLMProvider] = {}
        self._init_providers()

    def _init_providers(self):
        self._providers["openai"] = OpenAIProvider()
        self._providers["gemini"] = GeminiProvider()

    def get_provider(self, name: str = "openai") -> BaseLLMProvider:
        provider = self._providers.get(name.lower())
        if not provider:
            if name.lower() == "gemini":
                provider = GeminiProvider()
                self._providers["gemini"] = provider
            else:
                provider = OpenAIProvider()
                self._providers["openai"] = provider
        return provider

provider_factory = ProviderFactory()
