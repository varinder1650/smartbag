from typing import List, Optional
from pydantic import BaseModel, Field, validator
from .base import BaseDocument, validate_object_id

class CartItem(BaseModel):
    product: str
    quantity: int = Field(..., gt=0)

    @validator('product')
    @classmethod
    def validate_product_id(cls, v):
        return validate_object_id(v)

class CartItemInDB(CartItem, BaseDocument):
    pass

class CartBase(BaseModel):
    user: str
    items: List[CartItem] = []

    @validator('user')
    @classmethod
    def validate_user_id(cls, v):
        return validate_object_id(v)

class CartCreate(CartBase):
    pass

class CartUpdate(BaseModel):
    items: Optional[List[CartItem]] = None

class CartInDB(CartBase, BaseDocument):
    pass

class CartResponse(CartBase, BaseDocument):
    pass 