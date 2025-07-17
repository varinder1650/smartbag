from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
import logging
from bson import ObjectId

from models.product import ProductCreate, ProductUpdate, ProductResponse, ProductInDB
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user, get_current_admin_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new product"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Validate category and brand exist
        category = await db.find_one("categories", {"_id": ObjectId(product_data.category)})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
        
        brand = await db.find_one("brands", {"_id": ObjectId(product_data.brand)})
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand not found"
            )
        
        # Create product
        product_dict = product_data.dict()
        product_id = await db.insert_one("products", product_dict)
        
        # Get created product with populated fields
        created_product = await db.find_one("products", {"_id": ObjectId(product_id)})
        
        # Populate category and brand
        created_product["category"] = category
        created_product["brand"] = brand
        
        return ProductResponse(**created_product)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )

@router.get("/", response_model=dict)
async def get_products(
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: DatabaseManager = Depends(get_database)
):
    """Get products with filtering and pagination"""
    try:
        # Build query
        query = {"is_active": True}
        
        if category:
            query["category"] = ObjectId(category)
        if brand:
            query["brand"] = ObjectId(brand)
        if in_stock:
            query["stock"] = {"$gt": 0}
        if min_price or max_price:
            query["price"] = {}
            if min_price:
                query["price"]["$gte"] = min_price
            if max_price:
                query["price"]["$lte"] = max_price
        if search:
            query["$text"] = {"$search": search}
        
        # Calculate pagination
        skip = (page - 1) * limit
        
        # Get products with populated fields
        pipeline = [
            {"$match": query},
            {
                "$lookup": {
                    "from": "categories",
                    "localField": "category",
                    "foreignField": "_id",
                    "as": "category"
                }
            },
            {
                "$lookup": {
                    "from": "brands",
                    "localField": "brand",
                    "foreignField": "_id",
                    "as": "brand"
                }
            },
            {"$unwind": "$category"},
            {"$unwind": "$brand"},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        products = await db.aggregate("products", pipeline)
        
        # Get total count
        total = await db.count_documents("products", query)
        
        return {
            "products": [ProductResponse(**product) for product in products],
            "pagination": {
                "currentPage": page,
                "totalPages": (total + limit - 1) // limit,
                "totalProducts": total,
                "hasNextPage": skip + len(products) < total,
                "hasPrevPage": page > 1
            }
        }
        
    except Exception as e:
        logger.error(f"Get products error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get products"
        )

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    db: DatabaseManager = Depends(get_database)
):
    """Get a specific product by ID"""
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID"
            )
        
        # Get product with populated fields
        pipeline = [
            {"$match": {"_id": ObjectId(product_id)}},
            {
                "$lookup": {
                    "from": "categories",
                    "localField": "category",
                    "foreignField": "_id",
                    "as": "category"
                }
            },
            {
                "$lookup": {
                    "from": "brands",
                    "localField": "brand",
                    "foreignField": "_id",
                    "as": "brand"
                }
            },
            {"$unwind": "$category"},
            {"$unwind": "$brand"}
        ]
        
        products = await db.aggregate("products", pipeline)
        
        if not products:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return ProductResponse(**products[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product"
        )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update a product"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID"
            )
        
        # Check if product exists
        existing_product = await db.find_one("products", {"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Validate category and brand if provided
        if product_data.category:
            category = await db.find_one("categories", {"_id": ObjectId(product_data.category)})
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category not found"
                )
        
        if product_data.brand:
            brand = await db.find_one("brands", {"_id": ObjectId(product_data.brand)})
            if not brand:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Brand not found"
                )
        
        # Update product
        update_data = product_data.dict(exclude_unset=True)
        success = await db.update_one(
            "products",
            {"_id": ObjectId(product_id)},
            update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update product"
            )
        
        # Get updated product
        updated_product = await db.find_one("products", {"_id": ObjectId(product_id)})
        return ProductResponse(**updated_product)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Delete a product"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID"
            )
        
        # Check if product exists
        existing_product = await db.find_one("products", {"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Delete product
        success = await db.delete_one("products", {"_id": ObjectId(product_id)})
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete product"
            )
        
        return {"message": "Product deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        ) 