"""Simple durable user memory and personalization helpers."""
from __future__ import annotations

import re
from datetime import datetime, timezone

from app.db.mongodb import get_db


MEMORY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("name_hint", re.compile(r"\bmy name is ([A-Za-z][A-Za-z\s'-]{1,40})", re.I)),
    ("course", re.compile(r"\bI(?:'m| am)?\s+(?:studying|learning|taking)\s+([A-Za-z0-9 ,&().+-]{2,80})", re.I)),
    ("academic_level", re.compile(r"\bI(?:'m| am)\s+(?:a|an)\s+([A-Za-z0-9 ,&().+-]{2,40}\bstudent)", re.I)),
    ("goal", re.compile(r"\b(?:my goal is|I want to|help me)\s+([A-Za-z0-9 ,&().:+-]{4,120})", re.I)),
]


def _normalize_fact(key: str, value: str) -> str:
    cleaned = " ".join(value.strip().split())
    if key == "name_hint":
        return cleaned.title()
    return cleaned


async def persist_explicit_memories(user_id: str, message: str) -> list[dict]:
    """Store lightweight durable memories when the user states explicit facts."""
    db = get_db()
    memories = []
    now = datetime.now(timezone.utc)

    text = message.strip()
    remember_match = re.search(r"\bremember(?: that)?\s+(.+)", text, re.I)
    if remember_match:
        value = _normalize_fact("remembered_fact", remember_match.group(1))
        memories.append({"key": "remembered_fact", "value": value, "kind": "explicit"})

    for key, pattern in MEMORY_PATTERNS:
        match = pattern.search(text)
        if match:
            value = _normalize_fact(key, match.group(1))
            memories.append({"key": key, "value": value, "kind": "profile"})

    stored = []
    for memory in memories:
        await db.user_memories.update_one(
            {"user_id": user_id, "key": memory["key"]},
            {
                "$set": {
                    "value": memory["value"],
                    "kind": memory["kind"],
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        stored.append(memory)

    return stored


async def get_memory_context(user_id: str, limit: int = 6) -> list[dict]:
    """Return recent durable user memories."""
    db = get_db()
    cursor = (
        db.user_memories.find({"user_id": user_id})
        .sort("updated_at", -1)
        .limit(limit)
    )

    memories = []
    async for doc in cursor:
        memories.append({
            "key": doc.get("key", ""),
            "value": doc.get("value", ""),
            "kind": doc.get("kind", "explicit"),
        })
    return memories


def format_personalization_context(preferences: dict | None, memories: list[dict]) -> str:
    """Render profile + memory context for prompts."""
    preferences = preferences or {}
    lines = []

    preferred_language = preferences.get("preferred_language")
    if preferred_language:
        lines.append(f"Preferred language: {preferred_language}")
    if preferences.get("academic_level"):
        lines.append(f"Academic level: {preferences['academic_level']}")
    if preferences.get("course"):
        lines.append(f"Course: {preferences['course']}")
    if preferences.get("syllabus_topics"):
        lines.append(f"Syllabus topics: {', '.join(preferences['syllabus_topics'])}")
    if preferences.get("learning_goals"):
        lines.append(f"Learning goals: {', '.join(preferences['learning_goals'])}")
    if preferences.get("response_style"):
        lines.append(f"Preferred response style: {preferences['response_style']}")

    if memories:
        rendered = ", ".join(
            f"{memory['key'].replace('_', ' ')} = {memory['value']}"
            for memory in memories if memory.get("value")
        )
        if rendered:
            lines.append(f"Remembered user facts: {rendered}")

    return "\n".join(lines)
