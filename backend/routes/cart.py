from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import logging
from bson import ObjectId
from pydantic import BaseModel

from models.cart import CartItem, CartCreate, CartUpdate, CartResponse
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user, get_current_user
from models.user import UserInDB
from utils.mongo import fix_mongo_types

logger = logging.getLogger(__name__)
router = APIRouter()

class AddToCartRequest(BaseModel):
    productId: str
    quantity: int = 1

class UpdateCartItemRequest(BaseModel):
    itemId: str
    quantity: int

@router.get("/public")
async def get_cart_public(
    db: DatabaseManager = Depends(get_database)
):
    """Get cart for non-authenticated users (returns empty cart)"""
    try:
        # For non-authenticated users, return empty cart
        return {"items": [], "message": "No authenticated user"}
    except Exception as e:
        logger.error(f"Get public cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cart"
        )

@router.post("/add")
async def add_to_cart(
    req: AddToCartRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Add product to cart"""
    product_id = req.productId
    quantity = req.quantity
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID"
            )
        
        # Check if product exists and is active
        product = await db.find_one("products", {
            "_id": ObjectId(product_id),
            "is_active": True
        })
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or inactive"
            )
        
        # Check if product is in stock
        if product["stock"] < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is out of stock"
            )
        
        # Find or create cart
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        
        if not cart:
            # Create new cart
            cart_data = {
                "user": ObjectId(current_user.id),
                "items": [{"product": ObjectId(product_id), "quantity": quantity}]
            }
            await db.insert_one("carts", cart_data)
        else:
            # Check if product already exists in cart
            existing_item = None
            for item in cart["items"]:
                if item["product"] == ObjectId(product_id):
                    existing_item = item
                    break
            
            if existing_item:
                existing_item["quantity"] += quantity
            else:
                cart["items"].append({"product": ObjectId(product_id), "quantity": quantity})
            
            # Update cart
            await db.update_one(
                "carts",
                {"_id": cart["_id"]},
                {"items": cart["items"]}
            )
        
        return {"message": "Product added to cart"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add to cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add to cart"
        )

@router.get("/")
async def get_cart(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get user's cart"""
    try:
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        logger.info(f"Fetched cart for user {current_user.id}: {cart}")
        if not cart:
            return {"items": []}
        # Populate product details
        items_with_products = []
        for item in cart["items"]:
            logger.info(f"Processing cart item: {item}")
            product = await db.find_one("products", {"_id": item["product"]})
            if product:
                # Convert ObjectId fields to strings for serialization
                product_fixed = fix_mongo_types(product)
                item_id = str(item.get("_id", "")) if item.get("_id") else ""
                items_with_products.append({
                    "_id": item_id,
                    "product": product_fixed,
                    "quantity": item.get("quantity", 0)
                })
            else:
                logger.warning(f"Cart item references missing product: {item['product']}")
        logger.info(f"Returning cart items: {items_with_products}")
        return {"items": items_with_products}
    except Exception as e:
        logger.error(f"Get cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cart"
        )

@router.put("/update")
async def update_cart_item(
    req: UpdateCartItemRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    item_id = req.itemId
    quantity = req.quantity
    try:
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0"
            )
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found"
            )
        # Find and update item
        item_found = False
        for item in cart["items"]:
            if str(item.get("_id", "")) == item_id:
                # Check if product is in stock
                product = await db.find_one("products", {"_id": item["product"]})
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Product not found"
                    )
                if product["stock"] < quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Not enough stock available"
                    )
                item["quantity"] = quantity
                item_found = True
                break
        if not item_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found in cart"
            )
        # Update cart
        await db.update_one(
            "carts",
            {"_id": cart["_id"]},
            {"items": cart["items"]}
        )
        return {"message": "Cart updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update cart"
        )

@router.delete("/remove")
async def remove_from_cart(
    item_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Remove item from cart"""
    try:
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found"
            )
        
        # Remove item
        cart["items"] = [item for item in cart["items"] if str(item.get("_id", "")) != item_id]
        
        # Update cart
        await db.update_one(
            "carts",
            {"_id": cart["_id"]},
            {"items": cart["items"]}
        )
        
        return {"message": "Item removed from cart"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove from cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove from cart"
        )

@router.delete("/clear")
async def clear_cart(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Clear user's cart"""
    try:
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found"
            )
        
        # Clear cart items
        await db.update_one(
            "carts",
            {"_id": cart["_id"]},
            {"items": []}
        )
        
        return {"message": "Cart cleared"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear cart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cart"
        )
