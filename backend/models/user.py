from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
from .base import BaseDocument
from datetime import datetime

def validate_role(role: str) -> str:
    valid_roles = ["user", "admin", "partner", "delivery"]
    if role not in valid_roles:
        raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
    return role

class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    role: str = Field(default="user")
    
    @validator('role')
    def validate_user_role(cls, v):
        return validate_role(v)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    role: Optional[str] = None
    
    @validator('role')
    def validate_user_role(cls, v):
        if v is not None:
            return validate_role(v)
        return v

class UserInDB(UserBase, BaseDocument):
    hashed_password: str
    is_active: bool = True

class UserResponse(UserBase, BaseDocument):
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class UserAddress(BaseModel):
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserAddressResponse(BaseModel):
    address: Optional[str] = None
    location: Optional[dict] = None
