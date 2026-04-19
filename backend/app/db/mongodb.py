"""MongoDB async connection using Motor."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    """Connect to MongoDB."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.DATABASE_NAME]

    # Create indexes
    await _db.users.create_index("email", unique=True)
    await _db.conversations.create_index("user_id")
    await _db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
    await _db.messages.create_index("conversation_id")
    await _db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await _db.user_memories.create_index([("user_id", 1), ("key", 1)], unique=True)
    await _db.user_memories.create_index([("user_id", 1), ("updated_at", -1)])
    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_db():
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        print("🔌 MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
