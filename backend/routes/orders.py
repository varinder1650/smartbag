from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import logging
from bson import ObjectId
from datetime import datetime

from models.order import OrderCreate, OrderUpdate, OrderResponse, OrderInDB
from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new order"""
    try:
        # Validate required fields
        if not order_data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order items are required"
            )
        
        if not order_data.delivery_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Complete delivery address is required"
            )
        
        if order_data.total_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid total amount is required"
            )
        
        # Check stock for all products
        for item in order_data.items:
            product = await db.find_one("products", {"_id": ObjectId(item.product)})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product not found: {item.product}"
                )
            if product["stock"] < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for product: {product['name']}"
                )
        
        # Decrement stock for all products
        for item in order_data.items:
            await db.update_one(
                "products",
                {"_id": ObjectId(item.product)},
                {"$inc": {"stock": -item.quantity}}
            )
        
        # Create order
        order_dict = order_data.dict()
        order_dict["user"] = ObjectId(current_user.id)
        order_dict["status_change_history"] = [{
            "status": "pending",
            "changed_at": datetime.utcnow(),
            "changed_by": current_user.name or "Customer"
        }]
        
        order_id = await db.insert_one("orders", order_dict)
        
        # Clear user's cart
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        if cart:
            await db.update_one(
                "carts",
                {"_id": cart["_id"]},
                {"items": []}
            )
        
        # Get created order
        created_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        return OrderResponse(**created_order)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create order error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )

@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get all orders (admin) or user's orders"""
    try:
        if current_user.role == "admin":
            # Admin can see all orders
            orders = await db.find_many("orders", sort=[("created_at", -1)])
        else:
            # User can only see their own orders
            orders = await db.find_many(
                "orders", 
                {"user": ObjectId(current_user.id)},
                sort=[("created_at", -1)]
            )
        
        return [OrderResponse(**order) for order in orders]
        
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get orders"
        )

@router.get("/my", response_model=List[OrderResponse])
async def get_my_orders(
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get current user's orders"""
    try:
        orders = await db.find_many(
            "orders", 
            {"user": ObjectId(current_user.id)},
            sort=[("created_at", -1)]
        )
        
        return [OrderResponse(**order) for order in orders]
        
    except Exception as e:
        logger.error(f"Get my orders error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get orders"
        )

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get a specific order"""
    try:
        if not ObjectId.is_valid(order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order ID"
            )
        
        order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if user can access this order
        if current_user.role != "admin" and order["user"] != ObjectId(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
        
        return OrderResponse(**order)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get order error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get order"
        )

@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_update: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Update order status (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        if not ObjectId.is_valid(order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order ID"
            )
        
        # Check if order exists
        order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Update order status
        new_status = status_update.get("status")
        if not new_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status is required"
            )
        
        # Add status change to history
        status_change = {
            "status": new_status,
            "changed_at": datetime.utcnow(),
            "changed_by": current_user.name or "Admin"
        }
        
        order["status_change_history"].append(status_change)
        
        # Update order
        success = await db.update_one(
            "orders",
            {"_id": ObjectId(order_id)},
            {
                "order_status": new_status,
                "status_change_history": order["status_change_history"]
            }
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status"
            )
        
        # Get updated order
        updated_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        return OrderResponse(**updated_order)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update order status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        ) 