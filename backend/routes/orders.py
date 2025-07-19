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
    order_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new order"""
    try:
        logger.info(f"Order creation request from user: {current_user.email}")
        logger.info(f"Order data received: {order_data}")
        
        # Validate required fields
        if not order_data.get("items"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order items are required"
            )
        
        if not order_data.get("delivery_address"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Complete delivery address is required"
            )
        
        if not order_data.get("total_amount") or order_data["total_amount"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid total amount is required"
            )
        
        # Add user ID to order data
        order_data["user"] = current_user.id
        
        # Validate order data with Pydantic model
        try:
            validated_order = OrderCreate(**order_data)
        except Exception as validation_error:
            logger.error(f"Order validation error: {validation_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order data: {str(validation_error)}"
            )
        
        # Check stock for all products
        for item in validated_order.items:
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
        for item in validated_order.items:
            await db.update_one(
                "products",
                {"_id": ObjectId(item.product)},
                {"$inc": {"stock": -item.quantity}}
            )
        
        # Create order
        order_dict = validated_order.dict()
        order_dict["user"] = ObjectId(current_user.id)
        order_dict["status_change_history"] = [{
            "status": "pending",
            "changed_at": datetime.utcnow(),
            "changed_by": current_user.name or "Customer"
        }]
        
        order_id = await db.insert_one("orders", order_dict)
        logger.info(f"Order created successfully with ID: {order_id}")
        
        # Clear user's cart
        cart = await db.find_one("carts", {"user": ObjectId(current_user.id)})
        if cart:
            await db.update_one(
                "carts",
                {"_id": cart["_id"]},
                {"items": []}
            )
            logger.info("User cart cleared successfully")
        
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

@router.post("/debug", response_model=dict)
async def create_debug_order(
    order_data: dict,
    db: DatabaseManager = Depends(get_database)
):
    """Create a debug order that bypasses authentication"""
    try:
        logger.info(f"Debug order creation request")
        logger.info(f"Order data received: {order_data}")
        
        # Validate required fields
        if not order_data.get("items"):
            return {"error": "Order items are required"}
        
        if not order_data.get("delivery_address"):
            return {"error": "Complete delivery address is required"}
        
        if not order_data.get("total_amount") or order_data["total_amount"] <= 0:
            return {"error": "Valid total amount is required"}
        
        # Create a debug order document
        order_doc = {
            "user": ObjectId("687b2bc0daea4a6658a34212"),  # Test user ID - updated to match test user
            "items": order_data["items"],
            "delivery_address": order_data["delivery_address"],
            "payment_method": order_data.get("payment_method", "cod"),
            "subtotal": order_data.get("subtotal", 0),
            "tax": order_data.get("tax", 0),
            "delivery_charge": order_data.get("delivery_charge", 0),
            "app_fee": order_data.get("app_fee", 0),
            "total_amount": order_data["total_amount"],
            "payment_status": "pending",
            "order_status": "pending",
            "status_change_history": [{
                "status": "pending",
                "changed_at": datetime.utcnow(),
                "changed_by": "Debug User"
            }],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        order_id = await db.insert_one("orders", order_doc)
        logger.info(f"Debug order created successfully with ID: {order_id}")
        
        return {
            "success": True,
            "message": "Debug order created successfully",
            "order_id": str(order_id),
            "total_amount": order_data["total_amount"]
        }
        
    except Exception as e:
        logger.error(f"Debug order creation error: {e}")
        return {"error": str(e)}

@router.post("/test", response_model=dict)
async def test_order_creation(
    order_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Test endpoint to debug order creation"""
    try:
        logger.info(f"Test order data received: {order_data}")
        logger.info(f"Current user: {current_user.email}")
        
        # Validate basic structure
        if not order_data.get("items"):
            return {"error": "No items in order"}
        
        if not order_data.get("delivery_address"):
            return {"error": "No delivery address"}
        
        if not order_data.get("total_amount"):
            return {"error": "No total amount"}
        
        return {
            "success": True,
            "message": "Order data validation passed",
            "user": current_user.email,
            "items_count": len(order_data.get("items", [])),
            "total_amount": order_data.get("total_amount")
        }
        
    except Exception as e:
        logger.error(f"Test order error: {e}")
        return {"error": str(e)}

@router.post("/simple", response_model=dict)
async def create_simple_order(
    order_data: dict,
    db: DatabaseManager = Depends(get_database)
):
    """Create a simple order without authentication for testing"""
    try:
        logger.info(f"Simple order creation request")
        logger.info(f"Order data received: {order_data}")
        
        # Validate required fields
        if not order_data.get("items"):
            return {"error": "Order items are required"}
        
        if not order_data.get("delivery_address"):
            return {"error": "Complete delivery address is required"}
        
        if not order_data.get("total_amount") or order_data["total_amount"] <= 0:
            return {"error": "Valid total amount is required"}
        
        # Create a simple order document
        order_doc = {
            "user": ObjectId("687b2bc0daea4a6658a34212"),  # Test user ID - updated to match test user
            "items": order_data["items"],
            "delivery_address": order_data["delivery_address"],
            "payment_method": order_data.get("payment_method", "cod"),
            "subtotal": order_data.get("subtotal", 0),
            "tax": order_data.get("tax", 0),
            "delivery_charge": order_data.get("delivery_charge", 0),
            "app_fee": order_data.get("app_fee", 0),
            "total_amount": order_data["total_amount"],
            "payment_status": "pending",
            "order_status": "pending",
            "status_change_history": [{
                "status": "pending",
                "changed_at": datetime.utcnow(),
                "changed_by": "Test User"
            }],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        order_id = await db.insert_one("orders", order_doc)
        logger.info(f"Simple order created successfully with ID: {order_id}")
        
        return {
            "success": True,
            "message": "Order created successfully",
            "order_id": str(order_id),
            "total_amount": order_data["total_amount"]
        }
        
    except Exception as e:
        logger.error(f"Simple order creation error: {e}")
        return {"error": str(e)}

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
        
        # Enhance orders with user information
        enhanced_orders = []
        for order in orders:
            # Fetch user information - convert string user ID back to ObjectId for lookup
            user_id = order["user"]
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            
            user = await db.find_one("users", {"_id": user_id})
            
            if user:
                # Add user information to order
                order["user_info"] = {
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", "N/A"),
                    "phone": user.get("phone", "N/A")
                }
            else:
                # Fallback if user not found
                order["user_info"] = {
                    "name": "Unknown User",
                    "email": "N/A",
                    "phone": "N/A"
                }
            enhanced_orders.append(order)
        
        return [OrderResponse(**order) for order in enhanced_orders]
        
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