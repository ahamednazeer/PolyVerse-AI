"""Conversation CRUD routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.db.mongodb import get_db
from app.models.schemas import ConversationCreate, ConversationUpdate, ConversationResponse, MessageResponse
from app.api.middleware.auth import get_current_user

router = APIRouter()


@router.get("")
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = current_user["_id"]
    skip = (page - 1) * limit

    cursor = (
        db.conversations.find({"user_id": user_id})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    conversations = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        conversations.append(doc)

    total = await db.conversations.count_documents({"user_id": user_id})

    return {
        "conversations": conversations,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": skip + limit < total,
    }


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = current_user["_id"]

    try:
        conv = await db.conversations.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": user_id,
        })
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation ID")

    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    conv["_id"] = str(conv["_id"])

    # Get messages
    messages_cursor = db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", 1)

    messages = []
    async for msg in messages_cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)

    return {"conversation": conv, "messages": messages}


@router.post("")
async def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": current_user["_id"],
        "title": data.title or "New Chat",
        "agent_type": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.conversations.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = current_user["_id"]

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if data.title is not None:
        update_fields["title"] = data.title

    result = await db.conversations.update_one(
        {"_id": ObjectId(conversation_id), "user_id": user_id},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return {"success": True}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = current_user["_id"]

    result = await db.conversations.delete_one(
        {"_id": ObjectId(conversation_id), "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Delete associated messages
    await db.messages.delete_many({"conversation_id": conversation_id})

    return {"success": True}
