"""File upload routes."""
import os
import uuid
import asyncio
from datetime import datetime, timezone

import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse

from app.config import settings
from app.db.mongodb import get_db
from app.api.middleware.auth import get_current_user

router = APIRouter()
_whisper_model = None
_indicbert_tokenizer = None

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg",
    "application/pdf",
    "text/plain", "text/html", "text/css", "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model(settings.WHISPER_MODEL)
    return _whisper_model


def _get_indicbert_tokenizer():
    global _indicbert_tokenizer
    if _indicbert_tokenizer is None:
        from transformers import AutoTokenizer
        _indicbert_tokenizer = AutoTokenizer.from_pretrained(settings.INDICBERT_MODEL)
    return _indicbert_tokenizer


def _normalize_transcription_language(language: str | None) -> str | None:
    if not language:
        return None

    normalized = language.strip().lower().replace("_", "-")
    alias_map = {
        "en": "en",
        "en-us": "en",
        "en-gb": "en",
        "hi": "hi",
        "hi-in": "hi",
        "ta": "ta",
        "ta-in": "ta",
        "te": "te",
        "te-in": "te",
        "ml": "ml",
        "ml-in": "ml",
        "kn": "kn",
        "kn-in": "kn",
    }
    return alias_map.get(normalized)


def _script_ratio(text: str, language: str) -> float:
    script_ranges = {
        "hi": (0x0900, 0x097F),
        "ta": (0x0B80, 0x0BFF),
        "te": (0x0C00, 0x0C7F),
        "kn": (0x0C80, 0x0CFF),
        "ml": (0x0D00, 0x0D7F),
    }
    lang_range = script_ranges.get(language)
    if not lang_range:
        return 0.0

    chars = [c for c in text if c.isalpha()]
    if not chars:
        return 0.0

    start, end = lang_range
    matched = sum(1 for c in chars if start <= ord(c) <= end)
    return matched / len(chars)


def _score_with_indicbert(text: str, language: str) -> float:
    """Heuristic text validation for Indic transcripts using script ratio + IndicBERT tokenization."""
    if language not in {"hi", "ta", "te", "kn", "ml"}:
        return 0.0
    if not text.strip():
        return 0.0

    score = _script_ratio(text, language) * 2.0
    try:
        tokenizer = _get_indicbert_tokenizer()
        encoded = tokenizer(text, add_special_tokens=True, truncation=True, max_length=256)
        input_ids = encoded.get("input_ids", [])
        if input_ids:
            unk_id = tokenizer.unk_token_id
            if unk_id is not None:
                known = sum(1 for token_id in input_ids if token_id != unk_id)
                score += known / max(len(input_ids), 1)
    except Exception:
        pass

    return score


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        # Allow code files by extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        code_exts = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h", ".rs", ".go", ".rb", ".php"}
        if ext not in code_exts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File type not allowed: {content_type}")

    # Validate size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Save file
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{file_id}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    # Save metadata to DB
    db = get_db()
    file_doc = {
        "_id": file_id,
        "user_id": current_user["_id"],
        "name": file.filename,
        "type": content_type,
        "size": len(contents),
        "path": filepath,
        "url": f"/uploads/{filename}",
        "created_at": datetime.now(timezone.utc),
    }
    await db.files.insert_one(file_doc)

    # Best-effort indexing for document chat.
    try:
        from app.rag.retriever import retriever

        ext = os.path.splitext(file.filename or "")[1].lower()
        indexable_exts = {
            ".pdf", ".doc", ".docx", ".txt", ".md", ".py", ".js", ".ts",
            ".tsx", ".jsx", ".java", ".cpp", ".c", ".h", ".go", ".rs",
            ".rb", ".php", ".html", ".css", ".csv",
        }
        if retriever.is_ready() and (content_type.startswith("text/") or ext in indexable_exts):
            await retriever.ingest_file(
                filepath,
                source=file.filename or filename,
                metadata={
                    "file_id": file_id,
                    "user_id": str(current_user["_id"]),
                    "filename": file.filename or filename,
                    "mime_type": content_type,
                },
            )
    except Exception:
        # Indexing is optional; upload should still succeed.
        pass

    return {
        "id": file_id,
        "name": file.filename,
        "type": content_type,
        "size": len(contents),
        "url": f"/uploads/{filename}",
    }


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
):
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio file required")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file")

    temp_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    temp_path = os.path.join(settings.UPLOAD_DIR, f"transcribe-{temp_id}{ext}")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    try:
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(contents)

        model = _get_whisper_model()
        language_hint = _normalize_transcription_language(language)
        base_options = {
            "task": "transcribe",
            "fp16": False,
            "temperature": 0,
            "condition_on_previous_text": True,
            "verbose": False,
        }
        auto_result = await asyncio.to_thread(model.transcribe, temp_path, **base_options)
        result = auto_result

        if language_hint:
            forced_options = {**base_options, "language": language_hint}
            forced_result = await asyncio.to_thread(model.transcribe, temp_path, **forced_options)

            if language_hint in {"hi", "ta", "te", "kn", "ml"}:
                auto_score = _score_with_indicbert(auto_result.get("text", "").strip(), language_hint)
                forced_score = _score_with_indicbert(forced_result.get("text", "").strip(), language_hint)
                result = forced_result if forced_score >= auto_score else auto_result
            else:
                result = forced_result

        return {
            "text": result.get("text", "").strip(),
            "language": result.get("language", "unknown"),
            "language_hint": language_hint,
        }
    except ImportError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Whisper not installed")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Transcription failed: {e}")
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            pass


@router.get("/{file_id}")
async def get_file(file_id: str):
    db = get_db()
    file_doc = await db.files.find_one({"_id": file_id})
    if not file_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    filepath = file_doc["path"]
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FileResponse(filepath, filename=file_doc.get("name", "file"), media_type=file_doc.get("type"))
