from fastapi import APIRouter, HTTPException, Depends, status, Request
import logging
import os
from datetime import timedelta
from app.services.auth_service import AuthService
from db.db_manager import DatabaseManager,get_database
from schema.user import UserCreate,UserResponse,TokenResponse,UserLogin
from app.utils.auth import get_current_user,create_access_token
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# add rate limiter
# limiter = Limiter(key_func=get_remote_address)
# router.state.limiter = limiter

# @router.exception_handler(RateLimitExceeded)
# async def rate_limit_handler(request:Request, exc: RateLimitExceeded):
#     return JSONResponse(
#         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
#         content ={"detail":"Rate limit exceeds"}
#     )

@router.post("/register")
async def resister_user(user_data: UserCreate, db: DatabaseManager = Depends(get_database)):
    try:
        auth_service = AuthService(db)
        created_user = await auth_service.create_user(user_data)
        logger.info(created_user)
        return UserResponse(**created_user)
    except HTTPException as e:
        raise e

@router.post("/login", response_model=TokenResponse)
# @limiter.limit("5/minute")
async def login_user(user_data:UserLogin, db:DatabaseManager = Depends(get_database)):
    try:
        auth_service = AuthService(db)
        user = await auth_service.authenticate_user(db,user_data.email,user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="wrong username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        token = create_access_token(
                    data = {'sub':user['email'],'role':user['role']},
                    exp_time=timedelta(minutes = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')))
                )
        logger.info(f"User {user['email']} logged in successfully")
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error : {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

@router.get("/profile")
async def get_me(current_user = Depends(get_current_user)):
    return current_user
