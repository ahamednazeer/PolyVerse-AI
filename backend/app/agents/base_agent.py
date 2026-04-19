"""Abstract Base Agent — Industry-standard agent interface with retry, logging, metrics."""
import time
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Any
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger("polyverse.agents")


class AgentStatus(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    STREAMING = "streaming"
    ERROR = "error"


@dataclass
class AgentMetrics:
    """Tracks agent performance metrics."""
    total_requests: int = 0
    total_errors: int = 0
    total_tokens: int = 0
    avg_latency_ms: float = 0.0
    _latencies: list[float] = field(default_factory=list)

    def record_request(self, latency_ms: float, tokens: int = 0):
        self.total_requests += 1
        self.total_tokens += tokens
        self._latencies.append(latency_ms)
        # Rolling average of last 100
        recent = self._latencies[-100:]
        self.avg_latency_ms = sum(recent) / len(recent)

    def record_error(self):
        self.total_errors += 1

    def to_dict(self) -> dict:
        return {
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "total_tokens": self.total_tokens,
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "error_rate": round(self.total_errors / max(self.total_requests, 1), 4),
        }


@dataclass
class AgentInput:
    """Standardized agent input."""
    message: str
    history: list[dict] = field(default_factory=list)
    files: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    language: str = "en"
    user_id: str = ""
    conversation_id: str = ""


@dataclass
class AgentOutput:
    """Standardized agent output."""
    content: str
    agent_name: str
    confidence: float = 1.0
    metadata: dict = field(default_factory=dict)
    tokens_used: int = 0
    latency_ms: float = 0.0
    citations: list[dict] = field(default_factory=list)


class BaseAgent(ABC):
    """Production-grade base agent with retry, metrics, and structured logging."""

    name: str = "base"
    description: str = ""
    version: str = "1.0.0"
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout_seconds: float = 60.0

    def __init__(self):
        self.metrics = AgentMetrics()
        self.status = AgentStatus.IDLE
        self._logger = logging.getLogger(f"polyverse.agents.{self.name}")

    async def _inject_file_contents(self, agent_input: AgentInput):
        """Inject attached-file context using retrieval first, with direct parsing as fallback."""
        if not agent_input.files:
            return

        file_contents = []
        doc_files = [
            f for f in agent_input.files
            if (f.get("type", "").startswith("text/"))
            or (f.get("type") == "application/pdf")
            or (f.get("name", "").lower().endswith((
                ".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx",
                ".jsx", ".html", ".css", ".java", ".cpp", ".c", ".h", ".go",
                ".rs", ".rb", ".php", ".pdf", ".doc", ".docx",
            )))
        ]

        if doc_files:
            try:
                from app.rag.retriever import retriever

                if retriever.is_ready():
                    retrieved_docs = await retriever.search(
                        agent_input.message,
                        top_k=5,
                        file_ids=[f.get("id", "") for f in doc_files if f.get("id")],
                        user_id=str(agent_input.user_id) if agent_input.user_id else None,
                    )
                    if retrieved_docs:
                        retrieved_context = []
                        for i, doc in enumerate(retrieved_docs, 1):
                            source = doc.get("source", "Attached document")
                            retrieved_context.append(
                                f"[Attached Source {i} — {source}]\n{doc.get('content', '')}"
                            )
                        agent_input.message += (
                            "\n\n--- Retrieved context from attached documents ---\n"
                            + "\n\n".join(retrieved_context)
                        )
                        return
            except Exception as e:
                self._logger.warning(f"Attached-file retrieval failed, falling back to direct parsing: {e}")

        for f in agent_input.files:
            path = f.get("path")
            name = f.get("name", "unknown_file")
            try:
                import os
                import aiofiles
                if path and os.path.exists(path):
                    ext = os.path.splitext(name)[1].lower()
                    text_exts = {".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".java", ".cpp", ".c", ".h", ".go", ".rs", ".rb", ".php"}
                    mime = f.get("type", "")

                    content = ""

                    if ext in text_exts or mime.startswith("text/") or mime == "application/json":
                        async with aiofiles.open(path, "r", encoding="utf-8") as file_obj:
                            content = await file_obj.read()
                    elif mime == "application/pdf" or ext == ".pdf":
                        from pypdf import PdfReader

                        reader = PdfReader(path)
                        pages = []
                        for page in reader.pages[:20]:
                            page_text = page.extract_text() or ""
                            if page_text.strip():
                                pages.append(page_text.strip())
                        content = "\n\n".join(pages)

                    # Prevent context window explosion
                    if content:
                        if len(content) > 60000:
                            content = content[:60000] + "\n...[Content truncated due to length limitations]"
                        file_contents.append(f"\n--- 📎 Attached File: {name} ---\n{content}\n--- End of {name} ---")
            except Exception as e:
                self._logger.warning(f"Failed to read attached file {name} into context: {e}")

        if file_contents:
            agent_input.message += "\n\n" + "\n\n".join(file_contents)

    def _inject_personalization_context(self, agent_input: AgentInput):
        """Inject durable user preferences and memory context."""
        personalization_context = agent_input.metadata.get("personalization_context", "").strip()
        if not personalization_context:
            return

        agent_input.message = (
            "[User personalization context]\n"
            f"{personalization_context}\n\n"
            "[Current request]\n"
            f"{agent_input.message}"
        )

    async def invoke(self, agent_input: AgentInput) -> AgentOutput:
        """Execute agent with retry logic, metrics, and error handling."""
        self.status = AgentStatus.PROCESSING
        start = time.monotonic()
        last_error = None

        for attempt in range(1, self.max_retries + 1):
            try:
                self._logger.info(
                    "Processing request",
                    extra={"agent": self.name, "attempt": attempt, "user_id": agent_input.user_id},
                )

                # Read attached files
                self._inject_personalization_context(agent_input)
                await self._inject_file_contents(agent_input)
                # Pre-processing hook
                processed_input = await self.preprocess(agent_input)

                # Core processing
                result = await asyncio.wait_for(
                    self.process(processed_input),
                    timeout=self.timeout_seconds,
                )

                # Post-processing hook
                result = await self.postprocess(result, processed_input)

                latency = (time.monotonic() - start) * 1000
                result.latency_ms = latency
                result.agent_name = self.name
                self.metrics.record_request(latency, result.tokens_used)

                self.status = AgentStatus.IDLE
                self._logger.info(
                    "Request completed",
                    extra={"agent": self.name, "latency_ms": round(latency, 2), "tokens": result.tokens_used},
                )
                return result

            except asyncio.TimeoutError:
                last_error = TimeoutError(f"Agent {self.name} timed out after {self.timeout_seconds}s")
                self._logger.warning(f"Timeout on attempt {attempt}/{self.max_retries}")

            except Exception as e:
                last_error = e
                self._logger.error(f"Error on attempt {attempt}/{self.max_retries}: {e}", exc_info=True)

            if attempt < self.max_retries:
                delay = self.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                await asyncio.sleep(delay)

        # All retries failed
        self.metrics.record_error()
        self.status = AgentStatus.ERROR
        latency = (time.monotonic() - start) * 1000

        return AgentOutput(
            content=f"I apologize, but I encountered an issue processing your request. Please try again.\n\n_Error: {str(last_error)}_",
            agent_name=self.name,
            confidence=0.0,
            metadata={"error": str(last_error), "retries_exhausted": True},
            latency_ms=latency,
        )

    async def invoke_stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        """Stream response with error handling."""
        self.status = AgentStatus.STREAMING
        start = time.monotonic()

        try:
            self._inject_personalization_context(agent_input)
            await self._inject_file_contents(agent_input)
            processed_input = await self.preprocess(agent_input)
            token_count = 0

            async for chunk in self.stream(processed_input):
                token_count += 1
                yield chunk

            latency = (time.monotonic() - start) * 1000
            self.metrics.record_request(latency, token_count)
            self._logger.info(f"Stream completed: {token_count} chunks, {latency:.0f}ms")

        except Exception as e:
            self.metrics.record_error()
            self._logger.error(f"Stream error: {e}", exc_info=True)
            yield f"\n\n_⚠️ An error occurred: {str(e)}_"

        finally:
            self.status = AgentStatus.IDLE

    # --- Hooks for subclasses ---

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Override to transform input before processing. Default: pass-through."""
        return agent_input

    async def postprocess(self, output: AgentOutput, agent_input: AgentInput) -> AgentOutput:
        """Override to transform output after processing. Default: pass-through."""
        return output

    def get_warmup_statuses(self, agent_input: AgentInput) -> list[str]:
        """Optional user-facing status messages before lazy model initialization."""
        return []

    async def prepare_models(self, agent_input: AgentInput, progress_callback=None):
        """Optional explicit model preparation hook with progress callback."""
        return None

    # --- Abstract methods ---

    @abstractmethod
    async def process(self, agent_input: AgentInput) -> AgentOutput:
        """Core processing logic. Must be implemented by subclasses."""
        ...

    @abstractmethod
    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        """Core streaming logic. Must be implemented by subclasses."""
        ...

    # --- Utilities ---

    def get_health(self) -> dict:
        """Return agent health status."""
        return {
            "name": self.name,
            "version": self.version,
            "status": self.status.value,
            "metrics": self.metrics.to_dict(),
        }
