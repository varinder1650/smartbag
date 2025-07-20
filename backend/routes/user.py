from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from bson import ObjectId
from typing import Optional, List

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

@router.get("/addresses")
async def get_user_addresses(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get all user addresses"""
    try:
        user = await db.find_one("users", {"_id": ObjectId(current_user.id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get addresses from user document
        addresses = user.get("addresses", [])
        
        # If no addresses array exists, create one from the single address if it exists
        if not addresses and user.get("address"):
            addresses = [{
                "_id": str(ObjectId()),
                "address": user.get("address"),
                "city": user.get("city", ""),
                "state": user.get("state", ""),
                "pincode": user.get("pincode", ""),
                "fullAddress": user.get("address"),
                "coordinates": user.get("location")
            }]
        
        return {"addresses": addresses}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user addresses error: {e}")
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

@router.post("/addresses")
async def save_user_address_to_list(
    address_data: UserAddress,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Save a new address to user's address list"""
    try:
        if not address_data.address or not address_data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        new_address = {
            "_id": str(ObjectId()),
            "address": address_data.address.strip(),
            "city": address_data.city or "",
            "state": address_data.state or "",
            "pincode": address_data.pincode or "",
            "fullAddress": address_data.address.strip(),
            "coordinates": {
                "latitude": address_data.latitude,
                "longitude": address_data.longitude
            } if address_data.latitude and address_data.longitude else None
        }
        
        # Add to addresses array
        success = await db.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            {"$push": {"addresses": new_address}}
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save address"
            )
        
        return {"message": "Address saved successfully", "address": new_address}
        
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