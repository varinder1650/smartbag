from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from .base import BaseDocument, validate_object_id
from datetime import datetime

class OrderItem(BaseModel):
    product: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

    @field_validator('product')
    @classmethod
    def validate_product_id(cls, v):
        return validate_object_id(v)

class DeliveryAddress(BaseModel):
    address: str
    city: str
    state: str
    pincode: str

class StatusChange(BaseModel):
    status: str
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: str

class OrderBase(BaseModel):
    user: str
    items: List[OrderItem]
    delivery_address: DeliveryAddress
    payment_method: str = "cod"
    subtotal: float = Field(..., gt=0)
    tax: float = Field(default=0, ge=0)
    delivery_charge: float = Field(default=0, ge=0)
    app_fee: float = Field(default=0, ge=0)
    total_amount: float = Field(..., gt=0)
    payment_status: str = "pending"
    order_status: str = "pending"
    status_change_history: List[StatusChange] = []

    @field_validator('user')
    @classmethod
    def validate_user_id(cls, v):
        return validate_object_id(v)

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    status_change_history: Optional[List[StatusChange]] = None

class OrderInDB(OrderBase, BaseDocument):
    pass

class OrderResponse(OrderBase, BaseDocument):
    pass 