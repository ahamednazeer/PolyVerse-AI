"""Chat route with SSE streaming — production-grade with agent orchestration."""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from bson import ObjectId

from app.db.mongodb import get_db
from app.models.schemas import ChatRequest
from app.api.middleware.auth import get_current_user
from app.agents.router import agent_router
from app.agents.base_agent import AgentInput

logger = logging.getLogger("polyverse.chat")

router = APIRouter()


@router.post("")
async def chat(
    request: Request,
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Main chat endpoint — returns SSE stream with agent routing."""

    async def event_stream():
        db = get_db()
        user_id = current_user["_id"]
        conversation_id = data.conversation_id

        try:
            # --- Create conversation if new ---
            if not conversation_id:
                conv_doc = {
                    "user_id": user_id,
                    "title": data.message[:60],
                    "agent_type": "",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
                result = await db.conversations.insert_one(conv_doc)
                conversation_id = str(result.inserted_id)
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"

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
            yield f"data: {json.dumps({'type': 'agent', 'agent': primary_agent_name, 'confidence': routing.confidence, 'reasoning': routing.reasoning})}\n\n"

            # --- Build agent input ---
            agent_input = AgentInput(
                message=data.message,
                history=history[:-1],  # exclude current message
                files=file_refs,
                metadata={
                    "language": data.language,
                    "voice": data.voice,
                    "is_crisis": routing.is_crisis,
                },
                language=data.language,
                user_id=user_id,
                conversation_id=conversation_id,
            )

            # --- Stream response ---
            agent = agent_router.get_agent(primary_agent_name)
            full_content = ""

            async for chunk in agent.invoke_stream(agent_input):
                full_content += chunk
                yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

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
                },
                "created_at": datetime.now(timezone.utc),
            }
            await db.messages.insert_one(assistant_msg)

            # --- Update conversation ---
            await db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "agent_type": primary_agent_name,
                }},
            )

            # --- Done event ---
            yield f"data: {json.dumps({'type': 'done', 'metadata': {'agent': primary_agent_name, 'chain': routing.chain, 'confidence': routing.confidence}})}\n\n"

        except Exception as e:
            logger.error(f"Chat stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': f'An error occurred: {str(e)}'})}\n\n"

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
