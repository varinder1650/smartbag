from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status, Request
import logging
import os
from datetime import timedelta
from app.services.auth_service import AuthService
from db.db_manager import DatabaseManager,get_database
from schema.user import UserCreate,TokenOut,UserResponse,TokenResponse,UserLogin, GoogleLogin, GoogleLoginResponse,GoogleTokenResponse
from app.utils.auth import create_refresh_token, get_current_user,create_access_token
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# Phone update model
class PhoneUpdate(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)

@router.post("/register", response_model=TokenOut)
async def register_user(user_data: UserCreate, db: DatabaseManager = Depends(get_database)):
    try:
        auth_service = AuthService(db)
        result = await auth_service.create_user(user_data)
        return TokenOut(**result)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration service error"
        )

@router.post("/login", response_model=TokenOut)
async def login_user(user_data: UserLogin, db: DatabaseManager = Depends(get_database)):
    try:
        auth_service = AuthService(db)
        user = await auth_service.authenticate_user(db, user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        access = create_access_token(
            data={'sub': str(user['_id']), 'role': user['role']},
            exp_time=timedelta(minutes=int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')))
        )
        refresh = await create_refresh_token(str(user['_id']), db)
        
        logger.info(f"User {user['email']} logged in successfully")
        
        # Format user response
        user_response = {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "address": user.get("address"),
            "city": user.get("city"),
            "state": user.get("state"),
            "pincode": user.get("pincode"),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "provider": user.get("provider", "local")
        }
        
        return TokenOut(
            access_token=access,
            refresh_token=refresh,
            requires_phone=user.get("phone") is None,
            token_type="bearer",
            user=UserResponse(**user_response)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

@router.post("/phone")
async def update_phone(
    phone_data: PhoneUpdate, 
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    try:
        auth_service = AuthService(db)
        updated_user = await auth_service.update_user_phone(current_user.id, phone_data.phone)
        
        # Format user response
        user_response = {
            "id": str(updated_user["_id"]),
            "name": updated_user["name"],
            "email": updated_user["email"],
            "phone": updated_user.get("phone"),
            "address": updated_user.get("address"),
            "city": updated_user.get("city"),
            "state": updated_user.get("state"),
            "pincode": updated_user.get("pincode"),
            "role": updated_user.get("role", "user"),
            "is_active": updated_user.get("is_active", True),
            "provider": updated_user.get("provider", "local")
        }
        
        return {
            "success": True,
            "message": "Phone number updated successfully",
            "user": user_response
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Phone update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update phone number"
        )

@router.get("/profile")
async def get_me(current_user=Depends(get_current_user)):
    return current_user

@router.post("/google", response_model=TokenOut)
async def google_login(user_info: GoogleLogin, db: DatabaseManager = Depends(get_database)):
    try:
        logger.info(f"Google login attempt: {user_info.dict()}")
        
        # Verify the Google ID token first (optional but recommended)
        # For now, we'll trust the client-side verification
        
        # Extract user info from the request
        user_data = user_info.user
        email = user_data.get("email")
        name = user_data.get("name") 
        google_id = user_data.get("googleId") or user_data.get("id")
        
        if not email or not name:
            logger.error(f"Missing required Google user data: email={email}, name={name}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required user information from Google"
            )
        
        logger.info(f"Processing Google login for: {email}")
        
        auth_service = AuthService(db)
        
        # Create or get Google user
        user, requires_phone = await auth_service.create_or_get_google_user(email, name, google_id)
        
        # Create JWT tokens for our app (not Google tokens!)
        access = create_access_token(
            data={'sub': str(user['_id']), 'role': user.get('role', 'user')},
            exp_time=timedelta(minutes=int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30)))
        )
        refresh = await create_refresh_token(str(user['_id']), db)
        
        # Format user response
        user_response = {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "address": user.get("address"),
            "city": user.get("city"),
            "state": user.get("state"),
            "pincode": user.get("pincode"),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "provider": user.get("provider", "google")
        }
        
        logger.info(f"Google user {email} logged in successfully, requires_phone: {requires_phone}")
        
        return TokenOut(
            access_token=access,
            refresh_token=refresh,
            requires_phone=requires_phone,
            token_type="bearer",
            user=UserResponse(**user_response)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )