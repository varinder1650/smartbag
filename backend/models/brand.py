from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseDocument

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class BrandInDB(BrandBase, BaseDocument):
    pass

class BrandResponse(BrandBase, BaseDocument):
    pass 