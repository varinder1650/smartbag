from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator, root_validator
# from .base import BaseDocument, validate_object_id
from datetime import datetime
from bson import ObjectId
from schema.products import ProductResponse

class OrderItem(BaseModel):
    product: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

    # @validator('product')
    # @classmethod
    # def validate_product_id(cls, v):
    #     return validate_object_id(v)

class OrderItemResponse(BaseModel):
    product: Dict[str, Any]  # Full product object
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

class UserInfo(BaseModel):
    name: str
    email: str
    phone: str

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
    delivery_partner: Optional[str] = None

    # @validator('user')
    # @classmethod
    # def validate_user_id(cls, v):
    #     return validate_object_id(v)

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    status_change_history: Optional[List[StatusChange]] = None
    delivery_partner: Optional[str] = None

class OrderInDB(OrderBase):
    pass

class OrderResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user: str
    user_info: Optional[UserInfo] = None
    items: List[OrderItemResponse]
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
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    delivery_partner: Optional[str] = None
    delivery_partner_info: Optional[UserInfo] = None

    # @validator('user')
    # @classmethod
    # def validate_user_id(cls, v):
    #     return validate_object_id(v)

    # @root_validator(pre=True)
    # @classmethod
    # def convert_object_ids(cls, data):
    #     if isinstance(data, dict):
    #         # Convert _id to string if it's an ObjectId
    #         if '_id' in data and isinstance(data['_id'], ObjectId):
    #             data['_id'] = str(data['_id'])
            
    #         # Convert user to string if it's an ObjectId
    #         if 'user' in data and isinstance(data['user'], ObjectId):
    #             data['user'] = str(data['user'])
    #         # Convert delivery_partner to string if it's an ObjectId
    #         if 'delivery_partner' in data and isinstance(data['delivery_partner'], ObjectId):
    #             data['delivery_partner'] = str(data['delivery_partner'])
            
    #         # Convert product IDs in items if they're ObjectIds
    #         if 'items' in data and isinstance(data['items'], list):
    #             for item in data['items']:
    #                 if isinstance(item, dict) and 'product' in item and isinstance(item['product'], ObjectId):
    #                     item['product'] = str(item['product'])
        
    #     return data

    # class Config:
    #     validate_by_name = True
    #     arbitrary_types_allowed = True
    #     json_encoders = {
    #         ObjectId: str
    #     }

class OrderResponseEnhanced(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user: str
    user_info: Optional[UserInfo] = None
    items: List[OrderItemResponse]  # Use enhanced items with full product details
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
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    delivery_partner: Optional[str] = None
    delivery_partner_info: Optional[UserInfo] = None

    # @validator('user')
    # @classmethod
    # def validate_user_id(cls, v):
    #     return validate_object_id(v)

    # @root_validator(pre=True)
    # @classmethod
    # def convert_object_ids(cls, data):
    #     if isinstance(data, dict):
    #         # Convert _id to string if it's an ObjectId
    #         if '_id' in data and isinstance(data['_id'], ObjectId):
    #             data['_id'] = str(data['_id'])
            
    #         # Convert user to string if it's an ObjectId
    #         if 'user' in data and isinstance(data['user'], ObjectId):
    #             data['user'] = str(data['user'])
    #         # Convert delivery_partner to string if it's an ObjectId
    #         if 'delivery_partner' in data and isinstance(data['delivery_partner'], ObjectId):
    #             data['delivery_partner'] = str(data['delivery_partner'])
        
    #     return data

    # class Config:
    #     validate_by_name = True
    #     arbitrary_types_allowed = True
    #     json_encoders = {
    #         ObjectId: str
    #     } 