"""PolyVerse AI — FastAPI Application Entry Point (Production-Grade)"""
import os
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.mongodb import connect_db, close_db
from app.api.routes import auth, chat, conversations, files, health
from app.api.middleware.rate_limit import limiter

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


# ===== Logging Configuration =====
def setup_logging():
    """Configure structured logging for the application."""
    log_format = (
        "%(asctime)s │ %(levelname)-7s │ %(name)-30s │ %(message)s"
    )
    logging.basicConfig(
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
        format=log_format,
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )
    # Suppress noisy libraries
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("motor").setLevel(logging.WARNING)

setup_logging()
logger = logging.getLogger("polyverse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifecycle."""
    logger.info("🚀 Starting PolyVerse AI...")

    # --- Database ---
    await connect_db()

    # --- Directories ---
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # --- Agent Router ---
    from app.agents.router import agent_router
    agent_router.initialize()
    logger.info(f"🤖 Agent Router initialized with {len(agent_router._agents)} agents")

    # --- RAG (optional) ---
    try:
        from app.rag.retriever import retriever
        await retriever.initialize()
    except Exception as e:
        logger.warning(f"⚠️ RAG initialization skipped: {e}")

    # --- Startup Banner ---
    banner = f"""
╔══════════════════════════════════════════════════╗
║          🧠 PolyVerse AI v1.0.0                  ║
║──────────────────────────────────────────────────║
║  Server:  http://{settings.HOST}:{settings.PORT}                  ║
║  Docs:    http://{settings.HOST}:{settings.PORT}/docs              ║
║  Debug:   {str(settings.DEBUG):<38s}║
║  Groq:    {'✅ Connected':<38s}║
║  MongoDB: {'✅ Connected':<38s}║
║──────────────────────────────────────────────────║
║  Agents:                                         ║
║    📘 Teaching (RAG)   💻 Code Expert            ║
║    💚 Wellness Guide   👁️ Vision Analyst          ║
║    🌍 Multilingual     ✨ General                 ║
╚══════════════════════════════════════════════════╝
    """
    print(banner)

    yield

    # --- Shutdown ---
    await close_db()
    logger.info("🔌 PolyVerse AI shut down gracefully")


# ===== Application =====
app = FastAPI(
    title="PolyVerse AI",
    description="Multi-Agent Intelligence Platform with Groq-Powered Inference",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- Rate Limiter ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files ---
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# --- Routes ---
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])


@app.get("/", tags=["Root"])
async def root():
    """API root — service info."""
    from app.agents.router import agent_router
    return {
        "name": "PolyVerse AI",
        "version": "1.0.0",
        "status": "operational",
        "agents": [
            {"name": a.name, "version": a.version, "description": a.description}
            for a in agent_router._agents.values()
        ] if agent_router._initialized else [],
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
