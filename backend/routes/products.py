from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
import logging
from bson import ObjectId
import cloudinary
import cloudinary.uploader
import os
from PIL import Image
import io

from models.product import ProductCreate, ProductUpdate, ProductResponse, ProductInDB
from utils.database import DatabaseManager, get_database
from utils.mongo import fix_mongo_types
from utils.auth import get_current_active_user, get_current_admin_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

# Cloudinary config (assume env vars are set)
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

@router.post("/", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    stock: int = Form(...),
    category: str = Form(...),
    brand: str = Form(...),
    keywords: Optional[str] = Form(None),  # Comma-separated keywords
    images: Optional[List[UploadFile]] = File(None),
    current_user: UserInDB = Depends(get_current_admin_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new product with image upload to Cloudinary"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Validate category and brand exist
        category_obj = await db.find_one("categories", {"_id": ObjectId(category)})
        if not category_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
        
        brand_obj = await db.find_one("brands", {"_id": ObjectId(brand)})
        if not brand_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand not found"
            )
        
        # Parse keywords
        keyword_list = []
        if keywords:
            # Split by comma and clean up whitespace
            keyword_list = [kw.strip().lower() for kw in keywords.split(',') if kw.strip()]
        
        # Handle image upload
        image_urls = []
        if images:
            for image in images:
                if not image.content_type.startswith("image/"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File {image.filename} is not an image"
                    )
                
                # Read and compress image
                img_bytes = await image.read()
                img = Image.open(io.BytesIO(img_bytes))
                img_format = img.format if img.format else "JPEG"
                buf = io.BytesIO()
                img.save(buf, format=img_format, optimize=True, quality=70)  # compress
                buf.seek(0)
                
                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(buf, folder="products/")
                image_urls.append(upload_result["secure_url"])
        
        # Create product
        product_dict = {
            "name": name,
            "description": description,
            "price": price,
            "stock": stock,
            "category": ObjectId(category),
            "brand": ObjectId(brand),
            "keywords": keyword_list,
            "images": image_urls,
            "is_active": True
        }
        
        product_id = await db.insert_one("products", product_dict)
        created_product = await db.find_one("products", {"_id": ObjectId(product_id)})
        # Defensive: ensure category_obj and brand_obj are not None
        if not category_obj or not brand_obj:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Category or Brand not found after creation."
            )
        # Only include fields expected by ProductResponse
        allowed_fields = {
            "_id", "name", "description", "price", "images", "category", "brand", "stock", "is_active", "keywords", "created_at", "updated_at"
        }
        filtered_product = {k: v for k, v in created_product.items() if k in allowed_fields}
        # Convert _id to string if present
        if "_id" in filtered_product:
            filtered_product["_id"] = str(filtered_product["_id"])
        filtered_product["category"] = {
            "_id": str(category_obj["_id"]),
            "name": category_obj["name"]
        }
        filtered_product["brand"] = {
            "_id": str(brand_obj["_id"]),
            "name": brand_obj["name"]
        }
        return ProductResponse(**filtered_product)
        
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
            # Search in name, description, and keywords
            search_lower = search.lower()
            query["$or"] = [
                {"name": {"$regex": search_lower, "$options": "i"}},
                {"description": {"$regex": search_lower, "$options": "i"}},
                {"keywords": {"$in": [search_lower]}}
            ]
        
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
            "products": [ProductResponse(**fix_mongo_types(product)) for product in products],
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
        
        return ProductResponse(**fix_mongo_types(products[0]))
        
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