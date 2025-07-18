from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseDocument

class SettingsBase(BaseModel):
    app_fee: float = Field(default=10, ge=0)
    delivery_charge: float = Field(default=40, ge=0)
    gst_rate: float = Field(default=5, ge=0, le=100)
    min_order_amount: float = Field(default=100, ge=0)
    max_delivery_distance: float = Field(default=10, ge=0)

class SettingsCreate(SettingsBase):
    pass

class SettingsUpdate(BaseModel):
    app_fee: Optional[float] = Field(None, ge=0)
    delivery_charge: Optional[float] = Field(None, ge=0)
    gst_rate: Optional[float] = Field(None, ge=0, le=100)
    min_order_amount: Optional[float] = Field(None, ge=0)
    max_delivery_distance: Optional[float] = Field(None, ge=0)

class SettingsInDB(SettingsBase, BaseDocument):
    pass

class SettingsResponse(SettingsBase, BaseDocument):
    pass 