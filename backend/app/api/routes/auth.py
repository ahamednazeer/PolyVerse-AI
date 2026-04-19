"""Authentication routes — register, login, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, status, Response
from bson import ObjectId

from app.db.mongodb import get_db
from app.config import settings
from app.models.schemas import UserCreate, UserLogin, AuthResponse, UserResponse, UserPreferences, UserPreferencesUpdate
from app.api.middleware.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(data: UserCreate, response: Response):
    db = get_db()

    # Check existing user
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Create user
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "language": data.preferences.preferred_language,
        "preferences": data.preferences.model_dump(),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id, data.email)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.JWT_EXPIRY_MINUTES * 60,
    )

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            _id=user_id,
            name=data.name,
            email=data.email,
            role="user",
            language=data.preferences.preferred_language,
            preferences=data.preferences,
            created_at=user_doc["created_at"],
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: UserLogin, response: Response):
    db = get_db()

    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id, data.email)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.JWT_EXPIRY_MINUTES * 60,
    )

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            _id=user_id,
            name=user["name"],
            email=user["email"],
            role=user.get("role", "user"),
            language=user.get("language", "en"),
            preferences=UserPreferences(**user.get("preferences", {"preferred_language": user.get("language", "en")})),
            created_at=user["created_at"],
        ),
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear the authentication cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
    )
    return {"status": "success", "message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        _id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
        language=current_user.get("language", "en"),
        preferences=UserPreferences(**current_user.get("preferences", {"preferred_language": current_user.get("language", "en")})),
        created_at=current_user["created_at"],
    )


@router.put("/me/preferences", response_model=UserResponse)
async def update_preferences(
    data: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    existing_preferences = {
        "preferred_language": current_user.get("language", "en"),
        **current_user.get("preferences", {}),
    }
    updates = data.model_dump(exclude_none=True)
    merged_preferences = {
        **existing_preferences,
        **updates,
    }

    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "preferences": merged_preferences,
                "language": merged_preferences.get("preferred_language", current_user.get("language", "en")),
            }
        },
    )

    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    return UserResponse(
        _id=str(updated_user["_id"]),
        name=updated_user["name"],
        email=updated_user["email"],
        role=updated_user.get("role", "user"),
        language=updated_user.get("language", "en"),
        preferences=UserPreferences(**updated_user.get("preferences", {"preferred_language": updated_user.get("language", "en")})),
        created_at=updated_user["created_at"],
    )
