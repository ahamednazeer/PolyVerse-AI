"""General Assistant Agent — production-grade conversational agent."""
import logging
from typing import AsyncGenerator

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages

logger = logging.getLogger("polyverse.agents.general")


class GeneralAgent(BaseAgent):
    name = "general"
    description = "General-purpose conversational assistant"
    version = "1.0.0"

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        system_prompt = get_system_prompt("general")
        messages = build_messages(system_prompt, agent_input.message, agent_input.history)

        content = await groq_client.chat(messages)

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=1.0,
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        system_prompt = get_system_prompt("general")
        messages = build_messages(system_prompt, agent_input.message, agent_input.history)

        async for chunk in groq_client.stream_chat(messages):
            yield chunk
