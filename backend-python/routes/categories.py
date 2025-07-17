from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
import logging
from bson import ObjectId
import shutil
from pathlib import Path
import os

from models.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryInDB
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

@router.post("/", response_model=CategoryResponse)
async def create_category(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    icon: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new category"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Check if category already exists
        existing_category = await db.find_one("categories", {"name": name})
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category already exists"
            )
        
        # Handle icon upload
        icon_path = None
        if icon:
            # Validate file type
            if not icon.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Icon must be an image file"
                )
            
            # Generate unique filename
            file_extension = Path(icon.filename).suffix
            unique_filename = f"category_{os.urandom(8).hex()}{file_extension}"
            file_path = UPLOADS_DIR / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(icon.file, buffer)
            
            icon_path = f"/api/uploads/{unique_filename}"
        
        # Create category
        category_dict = {
            "name": name,
            "description": description,
            "icon": icon_path
        }
        
        category_id = await db.insert_one("categories", category_dict)
        
        # Get created category
        created_category = await db.find_one("categories", {"_id": ObjectId(category_id)})
        if created_category:
            # Convert _id to id for Pydantic model
            created_category['id'] = str(created_category['_id'])
            del created_category['_id']
        return CategoryResponse(**created_category)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create category error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(db: DatabaseManager = Depends(get_database)):
    """Get all categories"""
    try:
        categories = await db.find_many("categories", sort=[("name", 1)])
        
        # Convert ObjectId to string for each category
        for category in categories:
            if category:
                # Convert _id to id for Pydantic model
                category['id'] = str(category['_id'])
                del category['_id']
        
        return [CategoryResponse(**category) for category in categories]
        
    except Exception as e:
        logger.error(f"Get categories error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    db: DatabaseManager = Depends(get_database)
):
    """Get a specific category by ID"""
    try:
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID"
            )
        
        category = await db.find_one("categories", {"_id": ObjectId(category_id)})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Convert ObjectId to string
        if category:
            # Convert _id to id for Pydantic model
            category['id'] = str(category['_id'])
            del category['_id']
        
        return CategoryResponse(**category)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get category error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category"
        )

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    icon: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update a category"""
    try:
        logger.info(f"Update category request - ID: {category_id}, Name: {name}, Description: {description}, Icon: {icon.filename if icon else None}")
        
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID"
            )
        
        # Check if category exists
        existing_category = await db.find_one("categories", {"_id": ObjectId(category_id)})
        if not existing_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        logger.info(f"Found existing category: {existing_category}")
        
        # Handle icon upload
        icon_path = existing_category.get("icon")
        if icon:
            logger.info(f"Processing icon upload: {icon.filename}")
            # Validate file type
            if not icon.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Icon must be an image file"
                )
            
            # Generate unique filename
            file_extension = Path(icon.filename).suffix
            unique_filename = f"category_{os.urandom(8).hex()}{file_extension}"
            file_path = UPLOADS_DIR / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(icon.file, buffer)
            
            icon_path = f"/api/uploads/{unique_filename}"
            logger.info(f"Saved icon to: {icon_path}")
        
        # Prepare update data
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if icon_path is not None:
            update_data["icon"] = icon_path
        
        logger.info(f"Update data: {update_data}")
        
        if not update_data:
            # No changes needed, return the existing category
            logger.info("No changes detected, returning existing category")
            if existing_category:
                # Convert _id to id for Pydantic model
                existing_category['id'] = str(existing_category['_id'])
                del existing_category['_id']
            return CategoryResponse(**existing_category)
        
        # Update category
        await db.update_one(
            "categories",
            {"_id": ObjectId(category_id)},
            update_data
        )
        
        # Always return the updated category, regardless of modified_count
        updated_category = await db.find_one("categories", {"_id": ObjectId(category_id)})
        if updated_category:
            updated_category['id'] = str(updated_category['_id'])
            del updated_category['_id']
        logger.info(f"Updated category: {updated_category}")
        return CategoryResponse(**updated_category)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update category error: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Delete a category"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID"
            )
        
        # Check if category exists
        existing_category = await db.find_one("categories", {"_id": ObjectId(category_id)})
        if not existing_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if category is used by products
        products_count = await db.count_documents("products", {"category": ObjectId(category_id)})
        if products_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with existing products"
            )
        
        # Delete category
        success = await db.delete_one("categories", {"_id": ObjectId(category_id)})
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete category"
            )
        
        return {"message": "Category deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete category error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        ) 