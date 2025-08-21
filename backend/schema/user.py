from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class TokenData(BaseModel):
    email : EmailStr

class User(BaseModel):
    name : str = Field(...,min_length=1,max_length=100)
    email: EmailStr
    phone: str = Field(...,min_length=10,max_length=10)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    role:str = Field(default="user")
    is_active: bool = True

class UserCreate(User):
    password: str = Field(..., min_length = 6)

class UserResponse(User):
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserinDB(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type:str = "bearer"
    user: Optional[UserResponse] = None
