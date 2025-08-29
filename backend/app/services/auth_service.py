from fastapi import HTTPException, status
from app.utils.auth import create_pasword_hash, get_user, verify_password, create_access_token, create_refresh_token
from db.db_manager import DatabaseManager
from schema.user import UserCreate
from bson import ObjectId
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: DatabaseManager):
        self.db = db
    
    async def create_user(self, user_data: UserCreate):
        try:
            logger.info(f"Creating user with email: {user_data.email}")
            
            # Check if email already exists
            existing_email = await self.db.find_one('users', {"email": user_data.email})
            logger.info(f"Existing email check result: {existing_email}")
            
            if existing_email:
                logger.warning(f"Email {user_data.email} already exists")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            
            # Check if phone is provided and if it already exists
            requires_phone = True
            if hasattr(user_data, 'phone') and user_data.phone:
                existing_phone = await self.db.find_one("users", {"phone": user_data.phone})
                logger.info(f"Existing phone check result: {existing_phone}")
                
                if existing_phone:
                    logger.warning(f"Phone {user_data.phone} already exists")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Phone number already exists"
                    )
                requires_phone = False
            
            # Hash password
            logger.info("Hashing password...")
            hashed_password = create_pasword_hash(user_data.password)
            logger.info("Password hashed successfully")
            
            # Prepare user document
            user_doc = user_data.dict()
            user_doc["hashed_password"] = hashed_password
            user_doc["provider"] = "local"
            user_doc["created_at"] = datetime.utcnow()
            user_doc["is_active"] = True
            
            # Handle phone field properly - don't include it if not provided
            if not hasattr(user_data, 'phone') or not user_data.phone:
                # Don't include phone field at all if not provided
                if 'phone' in user_doc:
                    del user_doc['phone']
                requires_phone = True
            else:
                requires_phone = False
            
            # Remove password from document
            del user_doc['password']
            
            logger.info("Inserting user into database...")
            user_id = await self.db.insert_one("users", user_doc)
            user_id = str(user_id)
            logger.info(f"User created with ID: {user_id}")
            
            # Get the created user for response
            created_user = await self.db.find_one("users", {"_id": ObjectId(user_id)})
            if not created_user:
                logger.error("Failed to retrieve created user")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            # Create tokens
            logger.info("Creating access token...")
            access = create_access_token(
                data={'sub': user_id, 'role': user_data.role if hasattr(user_data, 'role') else 'user'},
                exp_time=timedelta(minutes=int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30)))
            )
            
            logger.info("Creating refresh token...")
            refresh = await create_refresh_token(user_id, self.db)
            
            logger.info("User registration completed successfully")
            
            # Format user response
            user_response = {
                "id": str(created_user["_id"]),
                "name": created_user["name"],
                "email": created_user["email"],
                "phone": created_user.get("phone"),
                "address": created_user.get("address"),
                "city": created_user.get("city"),
                "state": created_user.get("state"),
                "pincode": created_user.get("pincode"),
                "role": created_user.get("role", "user"),
                "is_active": created_user.get("is_active", True),
                "provider": created_user["provider"]
            }
            
            # Return in TokenOut format
            return {
                "access_token": access,
                "refresh_token": refresh,
                "requires_phone": requires_phone,
                "token_type": "bearer",
                "user": user_response
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"User creation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )

    async def authenticate_user(self, db, username, password):
        try:
            logger.info(f"Authenticating user: {username}")
            auth = await get_user(db, username)
            
            if not auth:
                logger.warning(f"User {username} not found")
                return None
                
            if not verify_password(password, auth['hashed_password']):
                logger.warning(f"Invalid password for user {username}")
                return None
                
            logger.info(f"User {username} authenticated successfully")
            return auth
            
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return None
    
    async def update_user_phone(self, user_id: str, phone: str):
        """Update user's phone number"""
        try:
            logger.info(f"Updating phone for user {user_id}")
            
            # Check if phone already exists for another user
            existing_phone = await self.db.find_one("users", {
                "phone": phone,
                "_id": {"$ne": ObjectId(user_id)}
            })
            
            if existing_phone:
                logger.warning(f"Phone {phone} already exists for another user")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already exists"
                )
            
            # Update user's phone
            await self.db.update_one(
                "users",
                {"_id": ObjectId(user_id)},
                {"$set": {"phone": phone, "phone_verified": False}}
            )
            
            # Get updated user
            updated_user = await self.db.find_one("users", {"_id": ObjectId(user_id)})
            logger.info(f"Phone updated successfully for user {user_id}")
            return updated_user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Phone update error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update phone number"
            )
    
    async def create_or_get_google_user(self, email: str, name: str, google_id: str):
        """Create or get Google user"""
        try:
            logger.info(f"Processing Google user: {email}")
            
            # Check if user exists
            existing_user = await self.db.find_one("users", {"email": email})
            
            if existing_user:
                logger.info(f"Google user {email} already exists")
                return existing_user, existing_user.get("phone") is None
            
            # Create new Google user
            user_doc = {
                "name": name,
                "email": email,
                "phone": None,
                "provider": "google",
                "google_id": google_id,
                "role": "user",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            
            user_id = await self.db.insert_one("users", user_doc)
            created_user = await self.db.find_one("users", {"_id": ObjectId(user_id)})
            
            logger.info(f"New Google user {email} created successfully")
            return created_user, True  # True indicates requires_phone
            
        except Exception as e:
            logger.error(f"Google user creation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process Google user"
            )