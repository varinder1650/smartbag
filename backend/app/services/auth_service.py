from fastapi import HTTPException, status
from app.utils.auth import create_pasword_hash,get_user,verify_password
from db.db_manager import DatabaseManager
from schema.user import UserCreate
from bson import ObjectId

class AuthService:
    def __init__(self,db: DatabaseManager):
        self.db = db
    
    async def create_user(self,user_data: UserCreate):
        existing_email = await self.db.find_one('users', {"email" :user_data.email})
        print(f"id: {existing_email}")
        if existing_email:
            print("email exists")
            raise HTTPException(
                status_code= status.HTTP_400_BAD_REQUEST,
                detail="Email already exists!!"
            )
        
        existing_phone = await self.db.find_one("users", {"phone" : user_data.phone})
        print(f"id: {existing_phone}")
        if existing_phone:
            raise HTTPException(
                status_code= status.HTTP_400_BAD_REQUEST,
                detail="Phone number already Exists"
            )
        
        hashed_password = create_pasword_hash(user_data.password)

        user_doc = user_data.dict()
        user_doc["hashed_password"] = hashed_password
        del user_doc['password']
        user_id = await self.db.insert_one("users",user_doc)

        created_user = await self.db.find_one("users", {"_id":ObjectId(user_id)})
        return created_user

    async def authenticate_user(self,db,username,password):
        auth = await get_user(db,username)
        if not verify_password(password,auth['hashed_password']):
            raise HTTPException(
                        status_code=401,
                        detail="Could not validate credentials",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
        return auth
