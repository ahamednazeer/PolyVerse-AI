"""Pydantic models for User, Conversation, Message."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class UserPreferences(BaseModel):
    preferred_language: str = "en"
    academic_level: str = ""
    course: str = ""
    syllabus_topics: list[str] = []
    learning_goals: list[str] = []
    response_style: str = "balanced"


# ===== User =====
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    preferences: UserPreferences = Field(default_factory=UserPreferences)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferencesUpdate(BaseModel):
    preferred_language: Optional[str] = None
    academic_level: Optional[str] = None
    course: Optional[str] = None
    syllabus_topics: Optional[list[str]] = None
    learning_goals: Optional[list[str]] = None
    response_style: Optional[str] = None


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: str
    role: str = "user"
    language: str = "en"
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    created_at: datetime

    class Config:
        populate_by_name = True


# ===== Conversation =====
class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    title: str
    agent_type: str = ""
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


# ===== Message =====
class FileRef(BaseModel):
    id: str = ""
    name: str = ""
    type: str = ""
    url: str = ""
    size: int = 0


class MessageResponse(BaseModel):
    id: str = Field(..., alias="_id")
    conversation_id: str
    role: str  # user | assistant | system
    content: str
    files: list[FileRef] = []
    agent: str = ""
    metadata: dict = {}
    created_at: datetime

    class Config:
        populate_by_name = True


# ===== Chat =====
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    files: Optional[list[str]] = None
    voice: bool = False
    response_voice: bool = False
    language: str = "en"


# ===== Auth Response =====
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
