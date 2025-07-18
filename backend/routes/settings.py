from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any
import logging

from utils.database import DatabaseManager, get_database
from utils.auth import get_current_admin_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

# Default settings
DEFAULT_SETTINGS = {
    "appFee": 10.0,
    "deliveryCharge": 40.0,
    "gstRate": 5.0,
    "minOrderAmount": 100.0,
    "maxDeliveryDistance": 10.0,
}

@router.get("/")
async def get_settings(
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get app settings"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Get settings from database
        settings_doc = await db.find_one("settings", {"_id": "app_settings"})
        
        if not settings_doc:
            # Create default settings if none exist
            settings_doc = {"_id": "app_settings", **DEFAULT_SETTINGS}
            await db.insert_one("settings", settings_doc)
            return DEFAULT_SETTINGS
        
        # Remove _id from response
        settings = {k: v for k, v in settings_doc.items() if k != "_id"}
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get settings"
        )

@router.put("/")
async def update_settings(
    settings_data: Dict[str, Any],
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update app settings"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Validate settings data
        allowed_fields = set(DEFAULT_SETTINGS.keys())
        provided_fields = set(settings_data.keys())
        
        if not provided_fields.issubset(allowed_fields):
            invalid_fields = provided_fields - allowed_fields
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid fields: {', '.join(invalid_fields)}"
            )
        
        # Validate numeric values
        for field, value in settings_data.items():
            if not isinstance(value, (int, float)) or value < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field} must be a positive number"
                )
        
        # Check if settings document exists
        existing_settings = await db.find_one("settings", {"_id": "app_settings"})
        
        if existing_settings:
            # Update existing settings
            success = await db.update_one(
                "settings",
                {"_id": "app_settings"},
                settings_data
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update settings"
                )
        else:
            # Create new settings document
            new_settings = {"_id": "app_settings", **DEFAULT_SETTINGS, **settings_data}
            await db.insert_one("settings", new_settings)
        
        # Get updated settings
        updated_settings = await db.find_one("settings", {"_id": "app_settings"})
        if updated_settings:
            settings = {k: v for k, v in updated_settings.items() if k != "_id"}
            return settings
        
        return settings_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        ) 