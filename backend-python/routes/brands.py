from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import logging
from bson import ObjectId

from models.brand import BrandCreate, BrandUpdate, BrandResponse, BrandInDB
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=BrandResponse)
async def create_brand(
    brand_data: BrandCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new brand"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Check if brand already exists
        existing_brand = await db.find_one("brands", {"name": brand_data.name})
        if existing_brand:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand already exists"
            )
        
        # Create brand
        brand_dict = brand_data.dict()
        brand_id = await db.insert_one("brands", brand_dict)
        
        # Get created brand
        created_brand = await db.find_one("brands", {"_id": ObjectId(brand_id)})
        if created_brand:
            # Convert _id to id for Pydantic model
            created_brand['id'] = str(created_brand['_id'])
            del created_brand['_id']
        return BrandResponse(**created_brand)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create brand error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create brand"
        )

@router.get("/", response_model=List[BrandResponse])
async def get_brands(db: DatabaseManager = Depends(get_database)):
    """Get all brands"""
    try:
        brands = await db.find_many("brands", sort=[("name", 1)])
        # Convert ObjectId to string for each brand
        for brand in brands:
            if brand:
                # Convert _id to id for Pydantic model
                brand['id'] = str(brand['_id'])
                del brand['_id']
        return [BrandResponse(**brand) for brand in brands]
        
    except Exception as e:
        logger.error(f"Get brands error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get brands"
        )

@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: str,
    brand_data: BrandUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update a brand"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(brand_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid brand ID"
            )
        
        # Check if brand exists
        existing_brand = await db.find_one("brands", {"_id": ObjectId(brand_id)})
        if not existing_brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found"
            )
        
        # Update brand
        update_data = brand_data.dict(exclude_unset=True)
        success = await db.update_one(
            "brands",
            {"_id": ObjectId(brand_id)},
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update brand"
            )
        
        # Get updated brand
        updated_brand = await db.find_one("brands", {"_id": ObjectId(brand_id)})
        if updated_brand:
            # Convert _id to id for Pydantic model
            updated_brand['id'] = str(updated_brand['_id'])
            del updated_brand['_id']
        return BrandResponse(**updated_brand)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update brand error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update brand"
        )

@router.delete("/{brand_id}")
async def delete_brand(
    brand_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Delete a brand"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(brand_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid brand ID"
            )
        
        # Check if brand exists
        existing_brand = await db.find_one("brands", {"_id": ObjectId(brand_id)})
        if not existing_brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found"
            )
        
        # Check if brand is used by products
        products_count = await db.count_documents("products", {"brand": ObjectId(brand_id)})
        if products_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete brand with existing products"
            )
        
        # Delete brand
        success = await db.delete_one("brands", {"_id": ObjectId(brand_id)})
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete brand"
            )
        
        return {"message": "Brand deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete brand error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete brand"
        ) 