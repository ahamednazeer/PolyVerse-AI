"""Multilingual Agent — Language detection, translation, code-switching, and Indic language support."""
import re
import logging
from typing import AsyncGenerator
from dataclasses import dataclass

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages

logger = logging.getLogger("polyverse.agents.multilingual")


LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "bn": "Bengali", "mr": "Marathi",
    "gu": "Gujarati", "pa": "Punjabi", "ur": "Urdu", "ar": "Arabic",
    "fr": "French", "es": "Spanish", "de": "German", "pt": "Portuguese",
    "it": "Italian", "ru": "Russian", "ja": "Japanese", "ko": "Korean",
    "zh-cn": "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
    "th": "Thai", "vi": "Vietnamese", "nl": "Dutch", "sv": "Swedish",
    "tr": "Turkish", "pl": "Polish", "uk": "Ukrainian",
}

# Script detection for Indic languages
SCRIPT_RANGES = {
    "devanagari": (0x0900, 0x097F, ["hi", "mr", "sa"]),
    "tamil": (0x0B80, 0x0BFF, ["ta"]),
    "telugu": (0x0C00, 0x0C7F, ["te"]),
    "kannada": (0x0C80, 0x0CFF, ["kn"]),
    "malayalam": (0x0D00, 0x0D7F, ["ml"]),
    "bengali": (0x0980, 0x09FF, ["bn"]),
    "gujarati": (0x0A80, 0x0AFF, ["gu"]),
    "gurmukhi": (0x0A00, 0x0A7F, ["pa"]),
    "arabic": (0x0600, 0x06FF, ["ar", "ur"]),
    "cjk": (0x4E00, 0x9FFF, ["zh-cn", "ja"]),
    "hangul": (0xAC00, 0xD7AF, ["ko"]),
    "thai": (0x0E00, 0x0E7F, ["th"]),
}


@dataclass
class LanguageAnalysis:
    """Result of language detection."""
    primary_language: str
    all_languages: list[str]
    scripts_detected: list[str]
    is_code_switching: bool  # Mixing multiple languages
    has_translation_request: bool
    translation_direction: tuple[str, str] | None  # (from, to)


TRANSLATION_PATTERNS = re.compile(
    r'\b(translate|convert|say\s+in|how\s+to\s+say|meaning\s+in|'
    r'what\s+is\s+.+\s+in\s+(hindi|tamil|telugu|english|kannada|malayalam|'
    r'bengali|marathi|gujarati|french|spanish|german|arabic|japanese|korean))\b',
    re.IGNORECASE,
)


class MultilingualAgent(BaseAgent):
    name = "multilingual"
    description = "Multi-language NLP with translation, code-switching, and Indic support"
    version = "2.0.0"

    def _detect_scripts(self, text: str) -> list[str]:
        """Detect Unicode scripts present in text."""
        detected = []
        for script_name, (start, end, _) in SCRIPT_RANGES.items():
            if any(start <= ord(c) <= end for c in text):
                detected.append(script_name)
        return detected

    def _detect_language_from_script(self, text: str) -> str | None:
        """Use Unicode script ranges for language identification."""
        script_counts = {}
        for script_name, (start, end, langs) in SCRIPT_RANGES.items():
            count = sum(1 for c in text if start <= ord(c) <= end)
            if count > 0:
                script_counts[script_name] = (count, langs)

        if script_counts:
            top_script = max(script_counts, key=lambda k: script_counts[k][0])
            return script_counts[top_script][1][0]  # Return first associated language
        return None

    def _detect_language(self, text: str) -> str:
        """Multi-strategy language detection."""
        # Strategy 1: Script-based (fast, reliable for non-Latin)
        script_lang = self._detect_language_from_script(text)
        if script_lang:
            return script_lang

        # Strategy 2: langdetect library
        try:
            from langdetect import detect
            return detect(text)
        except Exception:
            return "en"

    def _detect_all_languages(self, text: str) -> list[str]:
        """Detect all languages present (for code-switching detection)."""
        langs = set()

        # Script-based detection
        for _, (start, end, associated_langs) in SCRIPT_RANGES.items():
            if any(start <= ord(c) <= end for c in text):
                langs.update(associated_langs)

        # Statistical detection
        try:
            from langdetect import detect_langs
            for result in detect_langs(text):
                lang = str(result).split(":")[0]
                langs.add(lang)
        except Exception:
            pass

        if not langs:
            langs.add("en")

        return sorted(langs)

    def _parse_translation_request(self, text: str) -> tuple[str, str] | None:
        """Parse explicit translation requests."""
        text_lower = text.lower()

        # Pattern: "translate X to Y"
        match = re.search(r'translate\s+.+\s+to\s+(\w+)', text_lower)
        if match:
            target = match.group(1)
            for code, name in LANGUAGE_NAMES.items():
                if name.lower() == target or code == target:
                    return ("auto", code)

        # Pattern: "say X in Hindi"
        match = re.search(r'(?:say|how to say|what is)\s+.+\s+in\s+(\w+)', text_lower)
        if match:
            target = match.group(1)
            for code, name in LANGUAGE_NAMES.items():
                if name.lower() == target or code == target:
                    return ("auto", code)

        return None

    def _analyze(self, text: str) -> LanguageAnalysis:
        """Full language analysis."""
        primary = self._detect_language(text)
        all_langs = self._detect_all_languages(text)
        scripts = self._detect_scripts(text)
        has_translation = bool(TRANSLATION_PATTERNS.search(text))
        translation_dir = self._parse_translation_request(text)

        return LanguageAnalysis(
            primary_language=primary,
            all_languages=all_langs,
            scripts_detected=scripts,
            is_code_switching=len(all_langs) > 1,
            has_translation_request=has_translation,
            translation_direction=translation_dir,
        )

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Analyze language before processing."""
        analysis = self._analyze(agent_input.message)
        agent_input.metadata["lang_analysis"] = {
            "primary": analysis.primary_language,
            "primary_name": LANGUAGE_NAMES.get(analysis.primary_language, analysis.primary_language),
            "all_languages": analysis.all_languages,
            "scripts": analysis.scripts_detected,
            "is_code_switching": analysis.is_code_switching,
            "has_translation_request": analysis.has_translation_request,
            "translation_direction": analysis.translation_direction,
        }
        logger.info(
            f"Language analysis: primary={analysis.primary_language}, "
            f"all={analysis.all_languages}, scripts={analysis.scripts_detected}, "
            f"code_switching={analysis.is_code_switching}"
        )
        return agent_input

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        system_prompt = get_system_prompt("multilingual")
        lang = agent_input.metadata.get("lang_analysis", {})

        primary_name = lang.get("primary_name", "English")
        is_code_switching = lang.get("is_code_switching", False)
        translation_dir = lang.get("translation_direction")

        context_additions = f"""
[Language Analysis]
- Primary Language: {primary_name} ({lang.get('primary', 'en')})
- All Languages Detected: {', '.join(lang.get('all_languages', ['en']))}
- Scripts: {', '.join(lang.get('scripts', [])) or 'Latin'}
- Code-Switching: {'Yes — user is mixing languages' if is_code_switching else 'No'}
"""

        if translation_dir:
            source, target = translation_dir
            target_name = LANGUAGE_NAMES.get(target, target)
            context_additions += f"""
- Translation Request: {source} → {target_name}
- Provide the translation in {target_name} script
- Include pronunciation guide (romanized) for non-Latin scripts
"""
        else:
            context_additions += f"""
- Respond in {primary_name} (matching the user's language)
- If code-switching, respond naturally mixing the same languages
"""

        enhanced_prompt = f"{system_prompt}\n\n{context_additions}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)
        content = await groq_client.chat(messages, temperature=0.4)

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=0.85,
            metadata={"lang_analysis": lang},
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        system_prompt = get_system_prompt("multilingual")
        lang = agent_input.metadata.get("lang_analysis", {})
        primary_name = lang.get("primary_name", "English")

        context = f"[Respond in {primary_name}. Scripts: {', '.join(lang.get('scripts', [])) or 'Latin'}]"
        enhanced_prompt = f"{system_prompt}\n\n{context}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)

        async for chunk in groq_client.stream_chat(messages, temperature=0.4):
            yield chunk
