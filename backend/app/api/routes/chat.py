"""Chat route with SSE streaming — production-grade with agent orchestration."""
import json
import logging
import re
import contextlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_db
from app.models.schemas import ChatRequest
from app.api.middleware.auth import get_current_user
from app.agents.router import agent_router
from app.agents.base_agent import AgentInput
from app.llm.groq_client import groq_client
from app.services.memory import (
    format_personalization_context,
    get_memory_context,
    persist_explicit_memories,
)
import asyncio

logger = logging.getLogger("polyverse.chat")

router = APIRouter()


def _sse(data: dict) -> str:
    """Serialize SSE payloads without ASCII escaping for multilingual text."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("")
async def chat(
    request: Request,
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Main chat endpoint — returns SSE stream with agent routing."""

    async def _run_agent_chain(
        chain: list[str],
        initial_input: AgentInput,
    ) -> tuple[str, str]:
        current_input = initial_input
        final_content = ""
        final_agent = chain[-1] if chain else "general"

        for index, agent_name in enumerate(chain):
            agent = agent_router.get_agent(agent_name)
            result = await agent.invoke(current_input)
            final_content = result.content
            final_agent = agent_name

            if index < len(chain) - 1:
                current_input = AgentInput(
                    message=(
                        f"Original user request:\n{initial_input.message}\n\n"
                        f"Previous agent ({agent_name}) output:\n{result.content}"
                    ),
                    history=initial_input.history,
                    files=initial_input.files,
                    metadata={
                        **initial_input.metadata,
                        "previous_agent": agent_name,
                        "previous_agent_output": result.content,
                        "previous_chain": chain[: index + 1],
                    },
                    language=initial_input.language,
                    user_id=initial_input.user_id,
                    conversation_id=initial_input.conversation_id,
                )

        return final_content, final_agent

    async def _prepare_agent_with_progress(agent, agent_input: AgentInput):
        queue: asyncio.Queue[tuple[int, int] | None] = asyncio.Queue()

        def progress_callback(downloaded: int, total: int):
            try:
                queue.put_nowait((downloaded, total))
            except asyncio.QueueFull:
                pass

        async def _runner():
            await agent.prepare_models(agent_input, progress_callback)
            await queue.put(None)

        task = asyncio.create_task(_runner())
        try:
            while True:
                update = await queue.get()
                if update is None:
                    break
                yield update
        finally:
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def event_stream():
        db = get_db()
        user_id = current_user["_id"]
        conversation_id = data.conversation_id

        try:
            # --- Create conversation if new ---
            if not conversation_id:
                conv_doc = {
                    "user_id": user_id,
                    "title": data.message[:60], # Temporary title
                    "agent_type": "",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
                result = await db.conversations.insert_one(conv_doc)
                conversation_id = str(result.inserted_id)
                yield _sse({"type": "conversation_id", "conversation_id": conversation_id})

                # Trigger background task for smart title generation
                async def _generate_conversation_title(c_id: str, prompt_text: str):
                    try:
                        title_prompt = f"Summarize this query into a concise 3-5 word title for a UI sidebar link. Do NOT use quotes. Query: \"{prompt_text}\""
                        title = await groq_client.chat([{"role": "user", "content": title_prompt}], max_tokens=15, temperature=0.5)
                        title = title.strip('"').strip("'").strip()
                        if title:
                            await get_db().conversations.update_one(
                                {"_id": ObjectId(c_id)},
                                {"$set": {"title": title, "updated_at": datetime.now(timezone.utc)}}
                            )
                    except Exception as e:
                        logger.warning(f"Failed to generate smart title: {e}")
                
                asyncio.create_task(_generate_conversation_title(conversation_id, data.message[:200]))

            # --- Resolve file references ---
            file_refs = []
            if data.files:
                for file_id in data.files:
                    file_doc = await db.files.find_one({"_id": file_id})
                    if file_doc:
                        file_refs.append({
                            "id": file_id,
                            "name": file_doc.get("name", ""),
                            "type": file_doc.get("type", ""),
                            "url": file_doc.get("url", ""),
                            "path": file_doc.get("path", ""),
                            "size": file_doc.get("size", 0),
                        })

            # --- Save user message ---
            user_msg = {
                "conversation_id": conversation_id,
                "role": "user",
                "content": data.message,
                "files": file_refs,
                "agent": "",
                "metadata": {"language": data.language},
                "created_at": datetime.now(timezone.utc),
            }
            user_result = await db.messages.insert_one(user_msg)
            user_message_id = str(user_result.inserted_id)
            await persist_explicit_memories(str(user_id), data.message)

            # --- Load conversation history ---
            history_cursor = (
                db.messages.find({"conversation_id": conversation_id})
                .sort("created_at", 1)
                .limit(20)
            )
            history = []
            async for msg in history_cursor:
                history.append({"role": msg["role"], "content": msg["content"]})

            # --- Route to agent ---
            has_image = any(f.get("type", "").startswith("image/") for f in file_refs)
            has_voice = data.voice or any(f.get("type", "").startswith("audio/") for f in file_refs)
            has_document = any(
                (
                    f.get("type", "").startswith("text/")
                    or f.get("type") == "application/pdf"
                    or f.get("name", "").lower().endswith((
                        ".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx",
                        ".jsx", ".html", ".css", ".java", ".cpp", ".c", ".h", ".go",
                        ".rs", ".rb", ".php", ".pdf", ".doc", ".docx",
                    ))
                )
                for f in file_refs
            )

            routing = await agent_router.route(
                data.message,
                has_image=has_image,
                has_voice=has_voice,
                has_document=has_document,
            )

            primary_agent_name = routing.primary_agent
            yield _sse({
                "type": "agent",
                "agent": primary_agent_name,
                "confidence": routing.confidence,
                "reasoning": routing.reasoning,
            })

            # --- Build agent input ---
            agent_input = AgentInput(
                message=data.message,
                history=history[:-1],  # exclude current message
                files=file_refs,
                metadata={
                    "language": data.language,
                    "voice": data.voice,
                    "response_voice": data.response_voice,
                    "is_crisis": routing.is_crisis,
                },
                language=data.language,
                user_id=user_id,
                conversation_id=conversation_id,
            )

            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
            preferences = user_doc.get("preferences", {}) if user_doc else {}
            memories = await get_memory_context(str(user_id))
            agent_input.metadata["user_preferences"] = preferences
            agent_input.metadata["user_memories"] = memories
            agent_input.metadata["personalization_context"] = format_personalization_context(preferences, memories)

            # --- Stream response ---
            full_content = ""
            if len(routing.chain) > 1:
                for chained_agent in routing.chain[:-1]:
                    yield _sse({
                        "type": "agent",
                        "agent": chained_agent,
                        "phase": "preprocess",
                    })
                for chained_agent in routing.chain:
                    agent = agent_router.get_agent(chained_agent)
                    for status_message in agent.get_warmup_statuses(agent_input):
                        yield _sse({
                            "type": "status",
                            "agent": chained_agent,
                            "status": "loading_model",
                            "message": status_message,
                        })
                    async for downloaded, total in _prepare_agent_with_progress(agent, agent_input):
                        if total:
                            yield _sse({
                                "type": "status",
                                "agent": chained_agent,
                                "status": "loading_model_progress",
                                "progress": round((downloaded / total) * 100, 1),
                                "downloaded": downloaded,
                                "total": total,
                            })

                full_content, primary_agent_name = await _run_agent_chain(
                    routing.chain,
                    agent_input,
                )
                yield _sse({
                    "type": "agent",
                    "agent": primary_agent_name,
                    "phase": "final",
                })
                for token in re.split(r"(\s+)", full_content):
                    if not token:
                        continue
                    chunk = token
                    await asyncio.sleep(0.02)
                    yield _sse({"type": "content", "content": chunk})
            else:
                agent = agent_router.get_agent(primary_agent_name)
                for status_message in agent.get_warmup_statuses(agent_input):
                    yield _sse({
                        "type": "status",
                        "agent": primary_agent_name,
                        "status": "loading_model",
                        "message": status_message,
                    })
                async for downloaded, total in _prepare_agent_with_progress(agent, agent_input):
                    if total:
                        yield _sse({
                            "type": "status",
                            "agent": primary_agent_name,
                            "status": "loading_model_progress",
                            "progress": round((downloaded / total) * 100, 1),
                            "downloaded": downloaded,
                            "total": total,
                        })
                async for chunk in agent.invoke_stream(agent_input):
                    full_content += chunk
                    await asyncio.sleep(0.02) # Artificial slowdown to match ChatGPT cadence
                    yield _sse({"type": "content", "content": chunk})

            # --- Save assistant message ---
            assistant_msg = {
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": full_content,
                "files": [],
                "agent": primary_agent_name,
                "metadata": {
                    "reply_to_message_id": user_message_id,
                    "source_files": [
                        {
                            "id": f.get("id", ""),
                            "name": f.get("name", ""),
                            "type": f.get("type", ""),
                            "url": f.get("url", ""),
                            "size": f.get("size", 0),
                        }
                        for f in file_refs
                    ],
                    "routing": {
                        "agent": primary_agent_name,
                        "chain": routing.chain,
                        "confidence": routing.confidence,
                        "reasoning": routing.reasoning,
                    },
                    "language": data.language,
                    "voice": data.voice,
                    "response_voice": data.response_voice,
                },
                "created_at": datetime.now(timezone.utc),
            }
            await db.messages.insert_one(assistant_msg)

            # --- Update conversation ---
            try:
                await db.conversations.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {"$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "agent_type": primary_agent_name,
                    }},
                )
            except InvalidId:
                logger.warning(f"Invalid conversation ID format on update: {conversation_id}")

            # --- Done event ---
            yield _sse({
                "type": "done",
                "metadata": {
                    "agent": primary_agent_name,
                    "chain": routing.chain,
                    "confidence": routing.confidence,
                },
            })

        except Exception as e:
            logger.error(f"Chat stream error: {e}", exc_info=True)
            yield _sse({"type": "error", "content": f"An error occurred: {str(e)}"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/agents/health")
async def agents_health(current_user: dict = Depends(get_current_user)):
    """Get health status of all agents."""
    return {"agents": agent_router.get_all_health()}
