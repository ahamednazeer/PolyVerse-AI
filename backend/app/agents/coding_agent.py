"""Coding Agent — Code analysis, debugging, optimization with language detection and structured output."""
import re
import logging
from typing import AsyncGenerator
from dataclasses import dataclass

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages
from app.config import settings

logger = logging.getLogger("polyverse.agents.coding")


@dataclass
class CodeAnalysis:
    """Result of static code analysis."""
    language: str
    has_errors: bool
    error_patterns: list[str]
    code_blocks: list[dict]
    complexity_hint: str  # simple, moderate, complex


# ===== Language Detection =====
LANGUAGE_SIGNATURES = {
    "python": {
        "patterns": [
            r'^\s*def\s+\w+\s*\(', r'^\s*class\s+\w+', r'^\s*import\s+',
            r'^\s*from\s+\w+\s+import', r'print\s*\(', r'\bself\b',
            r'async\s+def\s+', r'\bawait\b', r'@\w+\b', r':\s*$',
        ],
        "extensions": ["py"],
        "weight": 1.0,
    },
    "javascript": {
        "patterns": [
            r'\bconst\s+\w+\s*=', r'\blet\s+\w+\s*=', r'\bvar\s+\w+\s*=',
            r'\bfunction\s+\w+\s*\(', r'=>', r'console\.log\(',
            r'\brequire\s*\(', r'\bnew\s+Promise\b', r'\basync\s+function\b',
        ],
        "extensions": ["js", "mjs", "cjs"],
        "weight": 1.0,
    },
    "typescript": {
        "patterns": [
            r'\b(interface|type)\s+\w+', r':\s*(string|number|boolean|any)\b',
            r'<\w+(\s*,\s*\w+)*>', r'\bas\s+\w+', r'\benum\s+\w+',
            r':\s*\w+\[\]', r'import\s+type\s+',
        ],
        "extensions": ["ts", "tsx"],
        "weight": 1.2,  # Boost TS when both JS and TS match
    },
    "java": {
        "patterns": [
            r'\bpublic\s+(static\s+)?(class|void|int|String)', r'\bprivate\s+',
            r'System\.out\.print', r'\bstatic\s+void\s+main\b',
            r'\bnew\s+\w+\(', r'\bextends\s+\w+', r'\bimplements\s+\w+',
        ],
        "extensions": ["java"],
        "weight": 1.0,
    },
    "cpp": {
        "patterns": [
            r'#include\s*<', r'\bstd::', r'\bcout\s*<<', r'\bcin\s*>>',
            r'\bnamespace\s+', r'\btemplate\s*<', r'\bvector\s*<',
            r'int\s+main\s*\(', r'\bclass\s+\w+\s*\{',
        ],
        "extensions": ["cpp", "cc", "cxx", "hpp"],
        "weight": 1.0,
    },
    "rust": {
        "patterns": [
            r'\bfn\s+\w+', r'\blet\s+mut\b', r'\bimpl\s+', r'\bpub\s+fn\b',
            r'\bmatch\s+', r'\b(Vec|Option|Result|String)::', r'\buse\s+\w+',
            r'\bmut\s+\w+\b', r'->',
        ],
        "extensions": ["rs"],
        "weight": 1.0,
    },
    "go": {
        "patterns": [
            r'\bfunc\s+\w+', r'\bpackage\s+\w+', r'\bfmt\.\w+',
            r'\b:=\b', r'\bgo\s+\w+', r'\bchan\s+', r'\bdefer\s+',
        ],
        "extensions": ["go"],
        "weight": 1.0,
    },
    "sql": {
        "patterns": [
            r'\bSELECT\b', r'\bFROM\b', r'\bWHERE\b', r'\bINSERT\s+INTO\b',
            r'\bCREATE\s+TABLE\b', r'\bJOIN\b', r'\bGROUP\s+BY\b',
        ],
        "extensions": ["sql"],
        "weight": 0.9,
    },
    "html": {
        "patterns": [r'<html', r'<div', r'<body', r'<head', r'</\w+>'],
        "extensions": ["html", "htm"],
        "weight": 0.7,
    },
    "css": {
        "patterns": [r'\{[^}]*:\s*[^}]+\}', r'@media', r'\.[\w-]+\s*\{', r'#[\w-]+\s*\{'],
        "extensions": ["css", "scss"],
        "weight": 0.7,
    },
    "shell": {
        "patterns": [r'#!/bin/(ba)?sh', r'\becho\s+', r'\bif\s+\[', r'\bfi\b', r'\bdone\b'],
        "extensions": ["sh", "bash"],
        "weight": 0.8,
    },
}

# Common error patterns across languages
ERROR_PATTERNS = {
    "syntax_error": re.compile(r'\b(syntax\s*error|unexpected\s*token|parse\s*error)\b', re.I),
    "type_error": re.compile(r'\b(type\s*error|cannot\s*assign|incompatible\s*type)\b', re.I),
    "runtime_error": re.compile(r'\b(runtime\s*error|exception|traceback|segfault|panic)\b', re.I),
    "import_error": re.compile(r'\b(import\s*error|module\s*not\s*found|no\s*module\s*named)\b', re.I),
    "logic_error": re.compile(r'\b(wrong\s*output|incorrect|not\s*working|doesn\'t\s*work|bug)\b', re.I),
    "memory_error": re.compile(r'\b(memory\s*leak|out\s*of\s*memory|stack\s*overflow|heap)\b', re.I),
    "performance": re.compile(r'\b(slow|optimize|performance|time\s*limit|tle|efficient)\b', re.I),
}


class CodingAgent(BaseAgent):
    name = "coding"
    description = "Production-grade code analysis, debugging, and optimization"
    version = "2.0.0"
    max_retries = 2

    def _detect_language(self, code: str) -> str:
        """Score-based language detection with weighted patterns."""
        scores: dict[str, float] = {}
        for lang, config in LANGUAGE_SIGNATURES.items():
            score = 0
            for pattern in config["patterns"]:
                matches = len(re.findall(pattern, code, re.MULTILINE))
                score += matches
            scores[lang] = score * config["weight"]

        if not scores or max(scores.values()) == 0:
            return "unknown"
        return max(scores, key=scores.get)

    def _extract_code_blocks(self, message: str) -> list[dict]:
        """Extract fenced code blocks with language tags."""
        blocks = []
        pattern = r'```(\w*)\n(.*?)```'
        for match in re.finditer(pattern, message, re.DOTALL):
            declared_lang = match.group(1).lower()
            code = match.group(2).strip()
            detected_lang = self._detect_language(code) if not declared_lang else declared_lang
            blocks.append({
                "language": detected_lang,
                "declared_language": declared_lang,
                "code": code,
                "line_count": code.count("\n") + 1,
            })
        return blocks

    def _detect_errors(self, message: str) -> list[str]:
        """Detect error patterns in the user's message."""
        found = []
        for error_type, pattern in ERROR_PATTERNS.items():
            if pattern.search(message):
                found.append(error_type)
        return found

    def _assess_complexity(self, code_blocks: list[dict]) -> str:
        """Estimate code complexity."""
        total_lines = sum(b["line_count"] for b in code_blocks)
        if total_lines == 0:
            return "simple"
        elif total_lines < 30:
            return "simple"
        elif total_lines < 100:
            return "moderate"
        return "complex"

    def _analyze(self, message: str) -> CodeAnalysis:
        """Full static analysis of the user's message."""
        code_blocks = self._extract_code_blocks(message)
        error_patterns = self._detect_errors(message)

        # If no code blocks, try detecting language from raw message
        language = "unknown"
        if code_blocks:
            language = code_blocks[0]["language"]
        else:
            language = self._detect_language(message)

        return CodeAnalysis(
            language=language,
            has_errors=len(error_patterns) > 0,
            error_patterns=error_patterns,
            code_blocks=code_blocks,
            complexity_hint=self._assess_complexity(code_blocks),
        )

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Run code analysis before LLM call."""
        analysis = self._analyze(agent_input.message)
        agent_input.metadata["code_analysis"] = {
            "language": analysis.language,
            "has_errors": analysis.has_errors,
            "error_patterns": analysis.error_patterns,
            "num_code_blocks": len(analysis.code_blocks),
            "complexity": analysis.complexity_hint,
        }
        logger.info(
            f"Code analysis: lang={analysis.language}, errors={analysis.error_patterns}, "
            f"blocks={len(analysis.code_blocks)}, complexity={analysis.complexity_hint}"
        )
        return agent_input

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        system_prompt = get_system_prompt("coding")
        analysis = agent_input.metadata.get("code_analysis", {})

        context_additions = f"""
[Code Analysis Results]
- Detected Language: {analysis.get('language', 'unknown')}
- Error Patterns Found: {', '.join(analysis.get('error_patterns', [])) or 'none'}
- Code Blocks: {analysis.get('num_code_blocks', 0)}
- Complexity: {analysis.get('complexity', 'unknown')}

Response guidelines:
1. If debugging — identify the root cause FIRST, then provide the fix
2. Always explain WHY the error occurs, not just how to fix it
3. Provide complete, runnable code (not fragments)
4. Include time/space complexity analysis where relevant
5. Suggest improvements and best practices
6. Use the detected language for code examples"""

        enhanced_prompt = f"{system_prompt}\n\n{context_additions}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)
        content = await groq_client.chat(
            messages,
            model=settings.GROQ_MODEL_CODING,
            temperature=0.2,  # Lower temperature for precise code
        )

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=0.9,
            metadata={"code_analysis": analysis},
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        system_prompt = get_system_prompt("coding")
        analysis = agent_input.metadata.get("code_analysis", {})

        context_additions = f"""
[Code Analysis: lang={analysis.get('language', '?')}, errors={analysis.get('error_patterns', [])}, complexity={analysis.get('complexity', '?')}]
Provide complete, runnable code. Explain root causes. Include complexity analysis."""

        enhanced_prompt = f"{system_prompt}\n\n{context_additions}"
        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history)

        async for chunk in groq_client.stream_chat(
            messages, model=settings.GROQ_MODEL_CODING, temperature=0.2
        ):
            yield chunk
