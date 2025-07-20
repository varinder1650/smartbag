from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator
from .base import BaseDocument, validate_object_id

class CategoryRef(BaseModel):
    id: str = Field(alias="_id")
    name: str

class BrandRef(BaseModel):
    id: str = Field(alias="_id")
    name: str

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    images: Optional[List[str]] = []
    category: str
    brand: str
    stock: int = Field(default=0, ge=0)
    is_active: bool = True
    keywords: Optional[List[str]] = Field(default=[], description="Keywords/tags for product search")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = Field(None, gt=0)
    images: Optional[List[str]] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    keywords: Optional[List[str]] = Field(None, description="Keywords/tags for product search")

    @validator('category', 'brand')
    @classmethod
    def validate_object_ids(cls, v):
        if v is not None:
            return validate_object_id(v)
        return v

class ProductInDB(ProductBase, BaseDocument):
    pass

class ProductResponse(ProductBase, BaseDocument):
    category: Union[CategoryRef, dict]
    brand: Union[BrandRef, dict] 