"""Wellness Agent — Clinical-grade mental health support with safety layers and escalation protocols."""
import re
import logging
from typing import AsyncGenerator
from dataclasses import dataclass
from enum import Enum

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages

logger = logging.getLogger("polyverse.agents.wellness")


class RiskLevel(str, Enum):
    NONE = "none"
    LOW = "low"        # General stress, mild discomfort
    MODERATE = "moderate"  # Anxiety, depression indicators
    HIGH = "high"      # Self-harm ideation
    CRITICAL = "critical"  # Immediate danger


@dataclass
class SafetyAssessment:
    risk_level: RiskLevel
    sentiment: str  # positive, negative, neutral
    intensity: float  # 0.0 - 1.0
    emotions: list[str]
    flags: list[str]
    requires_escalation: bool


# ===== Safety Keyword Engine =====
CRITICAL_PATTERNS = re.compile(
    r'\b(sui[cs]id[ea]l?|kill\s*(my)?self|end\s*my\s*life|want\s*to\s*die|'
    r'take\s*my\s*(own\s*)?life|no\s*reason\s*to\s*live|better\s*off\s*dead|'
    r'planning\s*to\s*(die|end|kill)|overdose|jump\s*off|hang\s*myself)\b',
    re.IGNORECASE,
)

HIGH_PATTERNS = re.compile(
    r'\b(self[\s-]?harm|cut\s*(my)?self|hurt\s*(my)?self|can\'?t\s*go\s*on|'
    r'ending\s*it|don\'?t\s*want\s*to\s*live|hate\s*myself|worthless|'
    r'nobody\s*cares|all\s*alone|can\'?t\s*take\s*it|breaking\s*point)\b',
    re.IGNORECASE,
)

MODERATE_PATTERNS = re.compile(
    r'\b(depress(ed|ion)|anxious|anxiety|panic\s*attack|insomnia|'
    r'overwhelm(ed|ing)|burnout|exhausted|hopeless|crying|grief|trauma|'
    r'ptsd|eating\s*disorder|substance|addict(ed|ion))\b',
    re.IGNORECASE,
)

EMOTION_LEXICON = {
    "sadness": ["sad", "down", "unhappy", "miserable", "heartbroken", "empty", "numb", "grief"],
    "anxiety": ["anxious", "worried", "nervous", "scared", "panic", "restless", "uneasy", "dread"],
    "anger": ["angry", "frustrated", "irritated", "furious", "resentful", "mad", "rageful"],
    "loneliness": ["lonely", "alone", "isolated", "abandoned", "disconnected", "left out"],
    "stress": ["stressed", "overwhelmed", "burnt out", "pressured", "tense", "overloaded"],
    "fear": ["afraid", "terrified", "frightened", "fearful", "petrified", "horrified"],
    "guilt": ["guilty", "ashamed", "regret", "remorse", "blame myself"],
    "hope": ["hopeful", "optimistic", "better", "improving", "progress", "grateful"],
}


# ===== Crisis Response Templates =====
CRISIS_RESPONSE = """🚨 **I hear you, and I want you to know that your life matters.**

What you're feeling right now is real, but it's temporary — and help is available **right now**.

### 📞 Please reach out immediately:

**🇮🇳 India:**
| Service | Number | Hours |
|---------|--------|-------|
| **iCall** | 9152987821 | Mon-Sat 8am-10pm |
| **Vandrevala Foundation** | 1860-2662-345 | 24/7 |
| **AASRA** | 91-22-27546669 | 24/7 |
| **Snehi** | 044-24640050 | 24/7 |

**🌍 International:**
| Service | Contact | Region |
|---------|---------|--------|
| **988 Lifeline** | Call/text 988 | US |
| **Crisis Text Line** | Text HOME to 741741 | US/UK/CA |
| **Samaritans** | 116 123 | UK/Ireland |
| **Lifeline** | 13 11 14 | Australia |

---

💛 **You are not a burden. You deserve support.**
A trained counselor can help you through this moment. Please reach out to one of the services above.

I'm here to listen if you'd like to continue talking. What would feel most helpful right now?
"""

HIGH_RISK_PREAMBLE = """⚠️ **I can sense you're going through something really difficult right now.**

Before we continue, I want to make sure you know: **professional support is available and free.** If at any point you feel unsafe, please reach out to:
- 🇮🇳 **Vandrevala Foundation**: 1860-2662-345 (24/7, free)
- 🌍 **Crisis Text Line**: Text HOME to 741741

---

"""


class WellnessAgent(BaseAgent):
    name = "wellness"
    description = "Clinical-grade mental wellness support with safety layers"
    version = "2.0.0"
    max_retries = 2
    timeout_seconds = 45.0

    def _assess_safety(self, message: str) -> SafetyAssessment:
        """Multi-layer safety assessment with emotion detection."""
        text = message.lower()
        flags = []
        risk = RiskLevel.NONE

        # Check risk levels (highest priority first)
        if CRITICAL_PATTERNS.search(message):
            risk = RiskLevel.CRITICAL
            flags.append("CRITICAL: Active suicidal ideation detected")
        elif HIGH_PATTERNS.search(message):
            risk = RiskLevel.HIGH
            flags.append("HIGH: Self-harm or severe distress indicators")
        elif MODERATE_PATTERNS.search(message):
            risk = RiskLevel.MODERATE
            flags.append("MODERATE: Mental health condition indicators")
        elif any(word in text for emotion_words in EMOTION_LEXICON.values() for word in emotion_words):
            risk = RiskLevel.LOW

        # Detect emotions
        detected_emotions = []
        for emotion, words in EMOTION_LEXICON.items():
            if any(w in text for w in words):
                detected_emotions.append(emotion)

        # Sentiment scoring
        neg_score = sum(1 for words in [
            EMOTION_LEXICON["sadness"], EMOTION_LEXICON["anxiety"],
            EMOTION_LEXICON["anger"], EMOTION_LEXICON["fear"],
            EMOTION_LEXICON["guilt"], EMOTION_LEXICON["loneliness"],
        ] for w in words if w in text)

        pos_score = sum(1 for w in EMOTION_LEXICON["hope"] if w in text)

        if neg_score > pos_score:
            sentiment, intensity = "negative", min(neg_score / 5, 1.0)
        elif pos_score > 0:
            sentiment, intensity = "positive", min(pos_score / 3, 1.0)
        else:
            sentiment, intensity = "neutral", 0.3

        return SafetyAssessment(
            risk_level=risk,
            sentiment=sentiment,
            intensity=intensity,
            emotions=detected_emotions,
            flags=flags,
            requires_escalation=risk in (RiskLevel.CRITICAL, RiskLevel.HIGH),
        )

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Run safety assessment before processing."""
        assessment = self._assess_safety(agent_input.message)
        agent_input.metadata["safety"] = {
            "risk_level": assessment.risk_level.value,
            "sentiment": assessment.sentiment,
            "intensity": assessment.intensity,
            "emotions": assessment.emotions,
            "flags": assessment.flags,
            "requires_escalation": assessment.requires_escalation,
        }
        logger.info(
            f"Safety assessment: risk={assessment.risk_level.value}, "
            f"emotions={assessment.emotions}, flags={assessment.flags}"
        )
        return agent_input

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        safety = agent_input.metadata.get("safety", {})
        risk_level = safety.get("risk_level", "none")

        # CRITICAL — return pre-built response immediately (never trust LLM for this)
        if risk_level == "critical":
            return AgentOutput(
                content=CRISIS_RESPONSE,
                agent_name=self.name,
                confidence=1.0,
                metadata={"safety": safety, "escalated": True},
            )

        system_prompt = get_system_prompt("wellness")
        context_additions = f"""
[Safety Assessment]
- Risk Level: {risk_level}
- Detected Emotions: {', '.join(safety.get('emotions', [])) or 'none detected'}
- Sentiment: {safety.get('sentiment', 'neutral')} (intensity: {safety.get('intensity', 0):.1f})
- Flags: {', '.join(safety.get('flags', [])) or 'none'}

Therapeutic approach guidelines:
- Use active listening and validate their feelings
- Reflect back what you hear to show understanding
- Ask open-ended follow-up questions
- Suggest evidence-based coping strategies when appropriate
- NEVER diagnose or prescribe medication
- If risk is high, gently suggest professional support"""

        enhanced_prompt = f"{system_prompt}\n\n{context_additions}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)
        content = await groq_client.chat(messages, temperature=0.8)

        if risk_level == "high":
            content = HIGH_RISK_PREAMBLE + content

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=0.85,
            metadata={"safety": safety},
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        safety = agent_input.metadata.get("safety", {})
        risk_level = safety.get("risk_level", "none")

        if risk_level == "critical":
            yield CRISIS_RESPONSE
            return

        if risk_level == "high":
            yield HIGH_RISK_PREAMBLE

        system_prompt = get_system_prompt("wellness")
        context_additions = f"""
[Safety Assessment]
- Risk Level: {risk_level}
- Detected Emotions: {', '.join(safety.get('emotions', [])) or 'none'}
- Sentiment: {safety.get('sentiment', 'neutral')} (intensity: {safety.get('intensity', 0):.1f})

Therapeutic approach: Validate → Reflect → Explore → Suggest coping strategies."""

        enhanced_prompt = f"{system_prompt}\n\n{context_additions}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)

        async for chunk in groq_client.stream_chat(messages, temperature=0.8):
            yield chunk
