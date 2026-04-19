"""Agent Router — LLM-assisted intent classification with confidence scoring and orchestration."""
import re
import logging
import time
from typing import AsyncGenerator
from dataclasses import dataclass

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.config import settings

logger = logging.getLogger("polyverse.router")


@dataclass
class RoutingDecision:
    """Result of intent classification."""
    primary_agent: str
    chain: list[str]  # ordered agent chain for multi-agent processing
    confidence: float
    reasoning: str
    is_crisis: bool = False


# ===== Crisis Detection — hardcoded for safety, never rely on LLM for this =====
CRISIS_PATTERNS = re.compile(
    r'\b(sui[cs]id[ea]l?|kill\s*(my)?self|end\s*my\s*life|want\s*to\s*die|'
    r'self[\s-]?harm|cut\s*(my)?self|hurt\s*(my)?self|no\s*reason\s*to\s*live|'
    r'better\s*off\s*dead|can\'?t?\s*go\s*on|ending\s*it\s*all|'
    r'don\'?t\s*want\s*to\s*live|take\s*my\s*(own\s*)?life)\b',
    re.IGNORECASE,
)

# ===== Rule-based fast-path patterns =====
CODE_BLOCK_PATTERN = re.compile(r'```[\s\S]*?```')
INDIC_SCRIPT_PATTERN = re.compile(r'[\u0900-\u0D7F\u0600-\u06FF\u0980-\u09FF]')

INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a multi-agent AI system. Analyze the user message and classify the PRIMARY intent.

Available agents:
- "general": General conversation, greetings, opinions, creative writing
- "teaching": Educational questions, explanations, study help, concepts, formulas, exam prep
- "wellness": Mental health, emotional support, stress, anxiety, feeling overwhelmed
- "coding": Programming, debugging, code review, algorithms, software development
- "vision": Image analysis (ONLY when user mentions or uploads images)
- "multilingual": Translation requests, non-English text, language-related queries

Rules:
1. Choose EXACTLY ONE primary agent
2. If the query could match multiple, pick the STRONGEST match
3. For code-related educational questions (e.g. "explain recursion"), prefer "teaching"
4. For "write code for X", prefer "coding"
5. For emotional content about academic stress, prefer "wellness"
6. Only choose "vision" if images are explicitly mentioned or uploaded

Respond in EXACTLY this format (no other text):
AGENT: <agent_name>
CONFIDENCE: <0.0-1.0>
REASON: <one line explanation>"""


class AgentRouter:
    """Production-grade agent router with LLM-backed classification and rule-based fast paths."""

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}
        self._initialized = False

    def register(self, agent: BaseAgent):
        """Register an agent."""
        self._agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name} v{agent.version}")

    def initialize(self):
        """Initialize all agents. Called once at startup."""
        from app.agents.general_agent import GeneralAgent
        from app.agents.teaching_agent import TeachingAgent
        from app.agents.wellness_agent import WellnessAgent
        from app.agents.coding_agent import CodingAgent
        from app.agents.vision_agent import VisionAgent
        from app.agents.multilingual_agent import MultilingualAgent

        self.register(GeneralAgent())
        self.register(TeachingAgent())
        self.register(WellnessAgent())
        self.register(CodingAgent())
        self.register(VisionAgent())
        self.register(MultilingualAgent())
        self._initialized = True
        logger.info(f"Router initialized with {len(self._agents)} agents")

    def get_agent(self, name: str) -> BaseAgent:
        """Get agent by name, fallback to general."""
        if not self._initialized:
            self.initialize()
        return self._agents.get(name, self._agents["general"])

    def get_all_health(self) -> list[dict]:
        """Get health status of all agents."""
        return [agent.get_health() for agent in self._agents.values()]

    # ===== Fast-path rule engine (no LLM call needed) =====

    def _fast_classify(
        self,
        message: str,
        has_image: bool,
        has_voice: bool,
        has_document: bool,
    ) -> RoutingDecision | None:
        """Rule-based fast classification for obvious cases. Returns None if uncertain."""

        # 🚨 CRISIS — always immediate, never send to LLM
        if CRISIS_PATTERNS.search(message):
            return RoutingDecision(
                primary_agent="wellness",
                chain=["wellness"],
                confidence=1.0,
                reasoning="Crisis keywords detected — immediate wellness routing",
                is_crisis=True,
            )

        # 📷 Image uploaded — vision agent
        if has_image:
            return RoutingDecision(
                primary_agent="vision",
                chain=["vision"],
                confidence=0.95,
                reasoning="Image file attached",
            )

        # 🎙️ Audio uploaded — vision agent handles STT/transcription
        if has_voice:
            return RoutingDecision(
                primary_agent="vision",
                chain=["vision"],
                confidence=0.95,
                reasoning="Audio file attached",
            )

        # 📄 Document uploaded — teaching agent for document Q&A/summarization
        if has_document:
            return RoutingDecision(
                primary_agent="teaching",
                chain=["teaching"],
                confidence=0.9,
                reasoning="Document file attached",
            )

        # 💻 Contains code block — coding agent
        if CODE_BLOCK_PATTERN.search(message):
            return RoutingDecision(
                primary_agent="coding",
                chain=["coding"],
                confidence=0.9,
                reasoning="Code block detected in message",
            )

        # 🌍 Heavy Indic script content — multilingual agent
        indic_chars = len(INDIC_SCRIPT_PATTERN.findall(message))
        total_chars = max(len(message), 1)
        if indic_chars / total_chars > 0.3:
            return RoutingDecision(
                primary_agent="multilingual",
                chain=["multilingual"],
                confidence=0.85,
                reasoning=f"Indic script detected ({indic_chars}/{total_chars} chars)",
            )

        # Short greetings — general
        if len(message.split()) <= 3 and any(
            g in message.lower() for g in ["hi", "hello", "hey", "thanks", "thank you", "bye", "ok"]
        ):
            return RoutingDecision(
                primary_agent="general",
                chain=["general"],
                confidence=0.95,
                reasoning="Short greeting/acknowledgment",
            )

        return None  # Need LLM classification

    # ===== LLM-based classification =====

    async def _llm_classify(self, message: str) -> RoutingDecision:
        """Use LLM for intent classification when rules are insufficient."""
        try:
            messages = [
                {"role": "system", "content": INTENT_CLASSIFICATION_PROMPT},
                {"role": "user", "content": message[:500]},  # Truncate for speed
            ]

            response = await groq_client.chat(
                messages,
                model=settings.GROQ_MODEL_FAST,  # Use fast model for routing
                temperature=0.1,
                max_tokens=100,
            )

            # Parse structured response
            agent = "general"
            confidence = 0.5
            reasoning = "LLM classification"

            for line in response.strip().split("\n"):
                line = line.strip()
                if line.startswith("AGENT:"):
                    parsed = line.split(":", 1)[1].strip().lower()
                    if parsed in self._agents:
                        agent = parsed
                elif line.startswith("CONFIDENCE:"):
                    try:
                        confidence = float(line.split(":", 1)[1].strip())
                        confidence = max(0.0, min(1.0, confidence))
                    except ValueError:
                        pass
                elif line.startswith("REASON:"):
                    reasoning = line.split(":", 1)[1].strip()

            return RoutingDecision(
                primary_agent=agent,
                chain=[agent],
                confidence=confidence,
                reasoning=reasoning,
            )

        except Exception as e:
            logger.error(f"LLM classification failed: {e}. Falling back to general.")
            return RoutingDecision(
                primary_agent="general",
                chain=["general"],
                confidence=0.3,
                reasoning=f"LLM classification failed: {e}",
            )

    # ===== Multi-agent chain builder =====

    def _build_chain(
        self,
        decision: RoutingDecision,
        has_image: bool,
        has_voice: bool = False,
        has_document: bool = False,
    ) -> RoutingDecision:
        """Build multi-agent chain for complex queries."""

        # Image + non-English → Vision → Multilingual → Target
        if has_image and decision.primary_agent == "multilingual":
            decision.chain = ["vision", "multilingual"]

        # Image + teaching question → Vision → Teaching
        if has_image and decision.primary_agent == "teaching":
            decision.chain = ["vision", "teaching"]

        # Voice + multilingual → Vision transcription first, then multilingual response
        if has_voice and decision.primary_agent == "multilingual":
            decision.chain = ["vision", "multilingual"]

        # Voice + teaching/coding/wellness → Vision transcription first, then target agent
        if has_voice and decision.primary_agent in {"teaching", "coding", "wellness"}:
            decision.chain = ["vision", decision.primary_agent]

        # Document + multilingual → document retrieval plus multilingual response
        if has_document and decision.primary_agent == "multilingual":
            decision.chain = ["teaching", "multilingual"]

        return decision

    # ===== Main routing method =====

    async def route(
        self,
        message: str,
        has_image: bool = False,
        has_voice: bool = False,
        has_document: bool = False,
    ) -> RoutingDecision:
        """Route a message to the appropriate agent(s)."""
        if not self._initialized:
            self.initialize()

        start = time.monotonic()

        # Try fast-path rules first
        decision = self._fast_classify(message, has_image, has_voice, has_document)

        if decision is None:
            # Fall back to LLM classification
            decision = await self._llm_classify(message)

        # Build multi-agent chain if needed
        decision = self._build_chain(
            decision,
            has_image=has_image,
            has_voice=has_voice,
            has_document=has_document,
        )

        latency = (time.monotonic() - start) * 1000
        logger.info(
            f"Routed to [{decision.primary_agent}] (confidence={decision.confidence:.2f}, "
            f"chain={decision.chain}, latency={latency:.0f}ms): {decision.reasoning}"
        )

        return decision


# Singleton
agent_router = AgentRouter()
