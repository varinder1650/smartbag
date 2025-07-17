from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .base import BaseDocument, PyObjectId
from datetime import datetime

class OrderItem(BaseModel):
    product: PyObjectId
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

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
    user: PyObjectId
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