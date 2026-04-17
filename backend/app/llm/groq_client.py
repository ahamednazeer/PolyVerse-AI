"""Groq LLM client with streaming support."""
import asyncio
from typing import AsyncGenerator

from groq import AsyncGroq
from app.config import settings


class GroqClient:
    """Async wrapper for Groq API with streaming."""

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Non-streaming chat completion."""
        if not self.client:
            return "⚠️ Groq API key not configured. Please set GROQ_API_KEY in your .env file."

        response = await self.client.chat.completions.create(
            model=model or settings.GROQ_MODEL_CHAT,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def stream_chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Streaming chat completion — yields content chunks."""
        if not self.client:
            yield "⚠️ Groq API key not configured. Please set GROQ_API_KEY in your .env file."
            return

        stream = await self.client.chat.completions.create(
            model=model or settings.GROQ_MODEL_CHAT,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def vision_chat(
        self,
        prompt: str,
        image_url: str,
        model: str | None = None,
    ) -> str:
        """Vision model chat with image input."""
        if not self.client:
            return "⚠️ Groq API key not configured."

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        response = await self.client.chat.completions.create(
            model=model or settings.GROQ_MODEL_VISION,
            messages=messages,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""


# Singleton
groq_client = GroqClient()
