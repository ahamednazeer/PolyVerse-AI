"""Teaching Agent — RAG-powered educator with citation tracking, reranking, and adaptive difficulty."""
import logging
import re
from typing import AsyncGenerator

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages
from app.config import settings

logger = logging.getLogger("polyverse.agents.teaching")

# Difficulty levels based on conversation context
DIFFICULTY_SYSTEM = """
When explaining, adapt to the user's level:
- If they use basic vocabulary → explain simply with analogies
- If they use technical terms → provide detailed, technical explanations
- If they ask "explain like I'm 5" → use very simple language
- If they ask for exam prep → be concise and focus on key points
"""

CITATION_INSTRUCTION = """
When using retrieved context, cite sources inline using [Source N] format.
Do not generate a final "Sources" or "📚 Sources" section yourself.
The system will append the final source list separately.
If no retrieved context is available, rely on your knowledge and note that.
"""


class TeachingAgent(BaseAgent):
    name = "teaching"
    description = "RAG-powered educational assistant with adaptive difficulty and citations"
    version = "2.0.0"
    max_retries = 2

    def _source_label(self, doc: dict) -> str:
        source = doc.get("source", "Unknown")
        metadata = doc.get("metadata", {}) or {}
        page = metadata.get("page")
        page_chunk_index = metadata.get("page_chunk_index")
        chunk_index = metadata.get("chunk_index")

        if page is not None:
            if page_chunk_index is not None:
                return f"{source}, p. {page}, chunk {page_chunk_index + 1}"
            return f"{source}, p. {page}"
        if chunk_index is not None:
            return f"{source}, chunk {chunk_index + 1}"
        return source

    def _unique_sources(self, docs: list[dict]) -> list[str]:
        seen = set()
        unique = []
        for doc in docs:
            source = doc.get("source", "Unknown")
            if source not in seen:
                seen.add(source)
                unique.append(source)
        return unique

    def _render_sources_block(self, citations: list[dict]) -> str:
        rendered = []
        seen = set()

        for citation in citations:
            if citation.get("type") == "file_sources":
                continue

            source_label = citation.get("source_label") or citation.get("source") or "Unknown"
            source = citation.get("source") or source_label
            if source in seen:
                continue
            seen.add(source)
            rendered.append(f"- {source_label}")

        if not rendered:
            return ""

        return "\n\n📚 Sources\n" + "\n".join(rendered)

    def _strip_model_sources_block(self, content: str) -> str:
        return re.sub(r"\n+📚 Sources[\s\S]*$", "", content).strip()

    async def _retrieve_context(self, query: str) -> tuple[str | None, list[dict]]:
        """Retrieve and rerank relevant context from vector store."""
        try:
            from app.rag.retriever import retriever
            if not retriever.is_ready():
                return None, []

            docs = await retriever.search(query, top_k=5)
            if not docs:
                return None, []

            # Rerank: score relevance based on keyword overlap
            query_words = set(query.lower().split())
            for doc in docs:
                content_words = set(doc["content"].lower().split()[:100])
                overlap = len(query_words & content_words)
                doc["relevance"] = doc.get("score", 0) + (overlap * 0.1)

            docs.sort(key=lambda d: d.get("relevance", 0), reverse=True)
            top_docs = docs[:3]  # Keep top 3 after reranking

            # Build context string with source labels
            parts = []
            citations = []
            for i, doc in enumerate(top_docs, 1):
                source = doc.get("source", "Unknown")
                source_label = self._source_label(doc)
                parts.append(f"[Source {i} — {source_label}]:\n{doc['content']}")
                citations.append({
                    "index": i,
                    "source": source,
                    "source_label": source_label,
                    "score": round(doc.get("relevance", 0), 3),
                    "preview": doc["content"][:100],
                    "page": doc.get("metadata", {}).get("page"),
                    "chunk_index": doc.get("metadata", {}).get("chunk_index"),
                })

            file_sources = self._unique_sources(top_docs)
            citations.append({
                "type": "file_sources",
                "sources": file_sources,
            })

            context = "\n\n---\n\n".join(parts)
            logger.info(f"Retrieved {len(top_docs)} documents for query: {query[:50]}...")
            return context, citations

        except ImportError:
            logger.debug("RAG not available — sentence-transformers/faiss not installed")
            return None, []
        except Exception as e:
            logger.warning(f"RAG retrieval error: {e}")
            return None, []

    def _detect_difficulty(self, agent_input: AgentInput) -> str:
        """Detect desired difficulty level from conversation context."""
        text = agent_input.message.lower()

        if any(k in text for k in ["eli5", "simple", "basics", "beginner", "easy"]):
            return "beginner"
        elif any(k in text for k in ["advanced", "detailed", "in-depth", "phd", "research"]):
            return "advanced"
        elif any(k in text for k in ["exam", "test", "quiz", "mcq", "short answer"]):
            return "exam_prep"
        return "intermediate"

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Enrich input with RAG context and difficulty metadata."""
        context, citations = await self._retrieve_context(agent_input.message)
        agent_input.metadata["rag_context"] = context
        agent_input.metadata["citations"] = citations
        agent_input.metadata["difficulty"] = self._detect_difficulty(agent_input)
        return agent_input

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        system_prompt = get_system_prompt("teaching")
        difficulty = agent_input.metadata.get("difficulty", "intermediate")
        context = agent_input.metadata.get("rag_context")
        citations = agent_input.metadata.get("citations", [])

        enhanced_prompt = f"{system_prompt}\n\n{DIFFICULTY_SYSTEM}\n\n[Student Level: {difficulty}]"
        if context:
            enhanced_prompt += f"\n\n{CITATION_INSTRUCTION}"

        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history, context)
        content = await groq_client.chat(messages, temperature=0.5)
        content = self._strip_model_sources_block(content)
        content += self._render_sources_block(citations)

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=0.9 if context else 0.7,
            citations=citations,
            metadata={"difficulty": difficulty, "rag_used": context is not None},
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        system_prompt = get_system_prompt("teaching")
        difficulty = agent_input.metadata.get("difficulty", "intermediate")
        context = agent_input.metadata.get("rag_context")
        citations = agent_input.metadata.get("citations", [])

        enhanced_prompt = f"{system_prompt}\n\n{DIFFICULTY_SYSTEM}\n\n[Student Level: {difficulty}]"
        if context:
            enhanced_prompt += f"\n\n{CITATION_INSTRUCTION}"

        messages = build_messages(enhanced_prompt, agent_input.message, agent_input.history, context)
        chunks = []
        async for chunk in groq_client.stream_chat(messages, temperature=0.5):
            chunks.append(chunk)

        final_content = self._strip_model_sources_block("".join(chunks))
        final_content += self._render_sources_block(citations)

        for token in re.split(r"(\s+)", final_content):
            if token:
                yield token
