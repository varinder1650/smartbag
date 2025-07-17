from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from bson import ObjectId
from typing import Optional

from models.user import UserAddress, UserAddressResponse
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/address", response_model=UserAddressResponse)
async def get_user_address(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get user address"""
    try:
        user = await db.find_one("users", {"_id": ObjectId(current_user.id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserAddressResponse(
            address=user.get("address"),
            location=user.get("location")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user address error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error"
        )

@router.post("/address", response_model=UserAddressResponse)
async def save_user_address(
    address_data: UserAddress,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Save user address"""
    try:
        if not address_data.address or not address_data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        update_data = {
            "address": address_data.address.strip(),
            "location": {
                "latitude": address_data.latitude,
                "longitude": address_data.longitude
            } if address_data.latitude and address_data.longitude else None
        }
        
        success = await db.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save address"
            )
        
        # Get updated user
        updated_user = await db.find_one("users", {"_id": ObjectId(current_user.id)})
        return UserAddressResponse(
            address=updated_user.get("address"),
            location=updated_user.get("location")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save user address error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error"
        )

@router.put("/address", response_model=UserAddressResponse)
async def update_user_address(
    address_data: UserAddress,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update user address"""
    try:
        if not address_data.address or not address_data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        update_data = {
            "address": address_data.address.strip(),
            "location": {
                "latitude": address_data.latitude,
                "longitude": address_data.longitude
            } if address_data.latitude and address_data.longitude else None
        }
        
        success = await db.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update address"
            )
        
        # Get updated user
        updated_user = await db.find_one("users", {"_id": ObjectId(current_user.id)})
        return UserAddressResponse(
            address=updated_user.get("address"),
            location=updated_user.get("location")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user address error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error"
        ) 