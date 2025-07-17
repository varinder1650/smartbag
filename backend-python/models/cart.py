from typing import List, Optional
from pydantic import BaseModel, Field
from .base import BaseDocument, PyObjectId

class CartItem(BaseModel):
    product: PyObjectId
    quantity: int = Field(..., gt=0)

class CartItemInDB(CartItem, BaseDocument):
    pass

class CartBase(BaseModel):
    user: PyObjectId
    items: List[CartItem] = []

class CartCreate(CartBase):
    pass

class CartUpdate(BaseModel):
    items: Optional[List[CartItem]] = None

class CartInDB(CartBase, BaseDocument):
    pass

class CartResponse(CartBase, BaseDocument):
    pass 