"""PolyVerse AI — Configuration"""
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # --- Groq ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL_CHAT: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_FAST: str = "llama-3.1-8b-instant"
    GROQ_MODEL_VISION: str = "llama-3.2-90b-vision-preview"
    GROQ_MODEL_CODING: str = "llama-3.3-70b-versatile"

    # --- OpenAI Fallback ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL_FALLBACK: str = "gpt-4o-mini"

    # --- MongoDB ---
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "polyverse_ai"

    # --- JWT ---
    JWT_SECRET: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DEBUG: bool = True

    # --- Files ---
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10

    # --- Rate Limiting ---
    RATE_LIMIT: str = "60/minute"

    # --- RAG ---
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "polyverse_rag"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # --- OCR ---
    OCR_ENGINE: str = "easyocr"
    OCR_LANGUAGES: str = "en,hi,ta,te,ml,kn"

    # --- Whisper ---
    WHISPER_MODEL: str = "small"

    # --- IndicBERT ---
    INDICBERT_MODEL: str = "ai4bharat/indic-bert"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def ocr_languages_list(self) -> list[str]:
        return [lang.strip() for lang in self.OCR_LANGUAGES.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
