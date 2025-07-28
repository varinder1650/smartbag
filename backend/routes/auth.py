from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
from datetime import timedelta, datetime
import logging
from bson import ObjectId
from pydantic import BaseModel, Field
import secrets

from models.user import UserCreate, UserResponse, UserLogin, Token, UserInDB
from utils.auth import (
    verify_password, get_password_hash, create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_current_active_user
)
from utils.database import DatabaseManager, get_database

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

def fix_mongo_id(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

def fix_mongo_types(doc):
    if isinstance(doc, dict):
        return {k: fix_mongo_types(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [fix_mongo_types(i) for i in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc

class LoginRequest(BaseModel):
    emailOrPhone: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: DatabaseManager = Depends(get_database)):
    """Register a new user"""
    try:
        # Check if user already exists (email)
        existing_user = await db.find_one("users", {"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        # Check if phone already exists
        existing_phone = await db.find_one("users", {"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already registered"
            )
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        # Create user document
        user_dict = user_data.dict()
        user_dict["hashed_password"] = hashed_password
        del user_dict["password"]
        # Insert user
        user_id = await db.insert_one("users", user_dict)
        # Get created user (convert user_id to ObjectId)
        created_user = await db.find_one("users", {"_id": ObjectId(user_id)})
        created_user = fix_mongo_types(created_user)
        return UserResponse(**created_user)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Registration error: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {e}"
        )

@router.post("/login", response_model=Token)
async def login(user_data: LoginRequest, db: DatabaseManager = Depends(get_database)):
    """Login user and return access token (by email or phone)"""
    try:
        # Find user by email or phone
        user = await db.find_one("users", {"$or": [
            {"email": user_data.emailOrPhone},
            {"phone": user_data.emailOrPhone}
        ]})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/phone or password"
            )
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/phone or password"
            )
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        user = fix_mongo_types(user)
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: UserInDB = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update current user profile"""
    try:
        # Remove None values
        update_data = {k: v for k, v in user_update.items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Update user
        success = await db.update_one(
            "users", 
            {"_id": current_user.id}, 
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        # Get updated user
        updated_user = await db.find_one("users", {"_id": current_user.id})
        return UserResponse(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get all users (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        users = await db.find_many("users")
        valid_users = []
        
        for user in users:
            try:
                # Fix ObjectId
                if user and '_id' in user and user['_id'] is not None:
                    user['id'] = str(user['_id'])
                    del user['_id']
                
                # Ensure phone number is valid (at least 10 characters)
                if not user.get('phone') or len(user.get('phone', '')) < 10:
                    user['phone'] = '0000000000'  # Default phone number
                
                # Ensure required fields are present
                if not user.get('name'):
                    user['name'] = 'Unknown User'
                if not user.get('email'):
                    user['email'] = 'unknown@example.com'
                if not user.get('role'):
                    user['role'] = 'user'
                
                valid_users.append(UserResponse(**user))
            except Exception as user_error:
                logger.warning(f"Skipping invalid user {user.get('_id', 'unknown')}: {user_error}")
                continue
        
        return valid_users
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get users"
        )

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new user (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Check if user already exists (email)
        existing_user = await db.find_one("users", {"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if phone already exists
        existing_phone = await db.find_one("users", {"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user document
        user_dict = user_data.dict()
        user_dict["hashed_password"] = hashed_password
        del user_dict["password"]
        
        # Insert user
        user_id = await db.insert_one("users", user_dict)
        
        # Get created user
        created_user = await db.find_one("users", {"_id": ObjectId(user_id)})
        created_user = fix_mongo_types(created_user)
        return UserResponse(**created_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update user (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        # Check if user exists
        existing_user = await db.find_one("users", {"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prepare update data
        update_data = {}
        
        # Update fields if provided
        if user_update.get("name"):
            update_data["name"] = user_update["name"]
        if user_update.get("email"):
            # Check if email is already taken by another user
            email_exists = await db.find_one("users", {
                "email": user_update["email"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if email_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            update_data["email"] = user_update["email"]
        if user_update.get("phone"):
            # Check if phone is already taken by another user
            phone_exists = await db.find_one("users", {
                "phone": user_update["phone"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if phone_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone already registered"
                )
            update_data["phone"] = user_update["phone"]
        if user_update.get("role"):
            update_data["role"] = user_update["role"]
        if user_update.get("password"):
            update_data["hashed_password"] = get_password_hash(user_update["password"])
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Update user
        success = await db.update_one(
            "users", 
            {"_id": ObjectId(user_id)}, 
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )
        
        # Get updated user
        updated_user = await db.find_one("users", {"_id": ObjectId(user_id)})
        updated_user = fix_mongo_types(updated_user)
        return UserResponse(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: DatabaseManager = Depends(get_database)):
    """Initiate password reset process"""
    try:
        user = await db.find_one("users", {"email": request.email})
        if not user:
            # Don't reveal that the user doesn't exist
            logger.info(f"Password reset requested for non-existent user: {request.email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}

        # Generate a secure token
        token = secrets.token_urlsafe(32)
        reset_token_expires = datetime.utcnow() + timedelta(hours=1)

        await db.update_one(
            "users",
            {"_id": user["_id"]},
            {"reset_token": token, "reset_token_expires": reset_token_expires}
        )

        # In a real app, you would send an email here
        logger.info(f"Password reset token for {request.email}: {token}")

        return {"message": "If an account with that email exists, a password reset link has been sent."}
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process forgot password request"
        )

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: DatabaseManager = Depends(get_database)):
    """Reset password using a token"""
    try:
        user = await db.find_one("users", {"reset_token": request.token})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )

        if user["reset_token_expires"] < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token has expired"
            )

        hashed_password = get_password_hash(request.password)
        await db.update_one(
            "users",
            {"_id": user["_id"]},
            {"hashed_password": hashed_password, "reset_token": None, "reset_token_expires": None}
        )

        return {"message": "Password has been reset successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_active_user)):
    return fix_mongo_types(current_user.dict(by_alias=True))
