from typing import List, Optional
from pydantic import BaseModel, Field
from .base import BaseDocument, PyObjectId

class CategoryRef(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str

class BrandRef(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    images: List[str] = []
    category: PyObjectId
    brand: PyObjectId
    stock: int = Field(default=0, ge=0)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = Field(None, gt=0)
    images: Optional[List[str]] = None
    category: Optional[PyObjectId] = None
    brand: Optional[PyObjectId] = None
    stock: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductInDB(ProductBase, BaseDocument):
    pass

class ProductResponse(ProductBase, BaseDocument):
    category: CategoryRef
    brand: BrandRef 