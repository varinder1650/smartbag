from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, Field, validator
from bson import ObjectId

def validate_object_id(v) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    # if isinstance(v, str) and ObjectId.is_valid(v):
    #     return v
    if isinstance(v, str):
        # Accept any 24-character hex string (for dummy/fallback IDs)
        if len(v) == 24 and all(c in "0123456789abcdefABCDEF" for c in v):
            return v
        if ObjectId.is_valid(v):
            return v
    raise ValueError("Invalid ObjectId")

class BaseDocument(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011"
            }
        } 