from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import logging
from bson import ObjectId
from datetime import datetime

from models.order import OrderCreate, OrderUpdate, OrderResponse, OrderResponseEnhanced, OrderInDB
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
        # Ensure created_at and updated_at are set
        now = datetime.utcnow()
        order_dict["created_at"] = order_dict.get("created_at", now)
        order_dict["updated_at"] = order_dict.get("updated_at", now)
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
        
        # Enhance orders with user information and product details
        enhanced_orders = []
        for order in orders:
            # Fetch user information - convert string user ID back to ObjectId for lookup
            user_id = order["user"]
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            user = await db.find_one("users", {"_id": user_id})
            if user:
                order["user_info"] = {
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", "N/A"),
                    "phone": user.get("phone", "N/A")
                }
            else:
                order["user_info"] = {
                    "name": "Unknown User",
                    "email": "N/A",
                    "phone": "N/A"
                }
            # Fetch delivery partner info if present
            partner_id = order.get("delivery_partner")
            if partner_id:
                if isinstance(partner_id, str):
                    try:
                        partner_id_obj = ObjectId(partner_id)
                    except Exception:
                        partner_id_obj = None
                else:
                    partner_id_obj = partner_id
                if partner_id_obj:
                    partner = await db.find_one("users", {"_id": partner_id_obj})
                    if partner:
                        order["delivery_partner_info"] = {
                            "name": partner.get("name", "Unknown"),
                            "email": partner.get("email", "N/A"),
                            "phone": partner.get("phone", "N/A")
                        }
            # Populate product details for each item
            for item in order.get("items", []):
                product_id = item.get("product")
                if product_id:
                    try:
                        product_obj_id = ObjectId(product_id) if isinstance(product_id, str) else product_id
                        product = await db.find_one("products", {"_id": product_obj_id})
                        if product:
                            # Fetch brand information
                            brand_name = "Unknown"
                            if product.get("brand"):
                                try:
                                    brand_obj_id = ObjectId(product["brand"]) if isinstance(product["brand"], str) else product["brand"]
                                    brand = await db.find_one("brands", {"_id": brand_obj_id})
                                    if brand:
                                        brand_name = brand.get("name", "Unknown")
                                except Exception:
                                    brand_name = "Unknown"
                            
                            item["product"] = {
                                "_id": str(product["_id"]),
                                "name": product.get("name", "Unknown"),
                                "price": product.get("price", 0),
                                "images": product.get("images", []),
                                "brand": {"name": brand_name}
                            }
                    except Exception as e:
                        logger.error(f"Error populating product details: {e}")
                        # Set default product structure if lookup fails
                        item["product"] = {
                            "_id": str(product_id),
                            "name": "Product not available",
                            "price": item.get("price", 0),
                            "images": [],
                            "brand": {"name": "Unknown"}
                        }
            enhanced_orders.append(order)
        return [OrderResponse(**order) for order in enhanced_orders]
        
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get orders"
        )

@router.get("/my", response_model=List[OrderResponseEnhanced])
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
        
        # Enhance orders with user information and product details
        enhanced_orders = []
        for order in orders:
            # Fetch user information
            user_id = order["user"]
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            user = await db.find_one("users", {"_id": user_id})
            if user:
                order["user_info"] = {
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", "N/A"),
                    "phone": user.get("phone", "N/A")
                }
            else:
                order["user_info"] = {
                    "name": "Unknown User",
                    "email": "N/A",
                    "phone": "N/A"
                }
            
            # Populate product details for each item
            for item in order.get("items", []):
                product_id = item.get("product")
                if product_id:
                    try:
                        product_obj_id = ObjectId(product_id) if isinstance(product_id, str) else product_id
                        product = await db.find_one("products", {"_id": product_obj_id})
                        if product:
                            # Fetch brand information
                            brand_name = "Unknown"
                            if product.get("brand"):
                                try:
                                    brand_obj_id = ObjectId(product["brand"]) if isinstance(product["brand"], str) else product["brand"]
                                    brand = await db.find_one("brands", {"_id": brand_obj_id})
                                    if brand:
                                        brand_name = brand.get("name", "Unknown")
                                except Exception:
                                    brand_name = "Unknown"
                            
                            item["product"] = {
                                "_id": str(product["_id"]),
                                "name": product.get("name", "Unknown"),
                                "price": product.get("price", 0),
                                "images": product.get("images", []),
                                "brand": {"name": brand_name}
                            }
                    except Exception as e:
                        logger.error(f"Error populating product details: {e}")
                        # Set default product structure if lookup fails
                        item["product"] = {
                            "_id": str(product_id),
                            "name": "Product not available",
                            "price": item.get("price", 0),
                            "images": [],
                            "brand": {"name": "Unknown"}
                        }
            
            enhanced_orders.append(order)
        
        return [OrderResponseEnhanced(**order) for order in enhanced_orders]
        
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
        if current_user.role != "admin" and order["user"] != ObjectId(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
        # Populate user_info
        user_id = order["user"]
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        user = await db.find_one("users", {"_id": user_id})
        if user:
            order["user_info"] = {
                "name": user.get("name", "Unknown"),
                "email": user.get("email", "N/A"),
                "phone": user.get("phone", "N/A")
            }
        else:
            order["user_info"] = {
                "name": "Unknown User",
                "email": "N/A",
                "phone": "N/A"
            }
        # Populate delivery_partner_info
        partner_id = order.get("delivery_partner")
        if partner_id:
            if isinstance(partner_id, str):
                try:
                    partner_id_obj = ObjectId(partner_id)
                except Exception:
                    partner_id_obj = None
            else:
                partner_id_obj = partner_id
            if partner_id_obj:
                partner = await db.find_one("users", {"_id": partner_id_obj})
                if partner:
                    order["delivery_partner_info"] = {
                        "name": partner.get("name", "Unknown"),
                        "email": partner.get("email", "N/A"),
                        "phone": partner.get("phone", "N/A")
                    }
        # Populate product details for each item
        for item in order.get("items", []):
            product_id = item.get("product")
            if product_id:
                try:
                    product_obj_id = ObjectId(product_id) if isinstance(product_id, str) else product_id
                    product = await db.find_one("products", {"_id": product_obj_id})
                    if product:
                        item["product_id"] = str(product["_id"])
                        item["product_name"] = product.get("name", "Unknown")
                        item["product_price"] = product.get("price", 0)
                except Exception:
                    pass
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
    """Update order status (admin only) and assign delivery partner if provided"""
    try:
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
        order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
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
        update_dict = {
            "order_status": new_status,
            "status_change_history": order["status_change_history"]
        }
        # Assign delivery partner if provided
        if "delivery_partner" in status_update:
            update_dict["delivery_partner"] = status_update["delivery_partner"]
        success = await db.update_one(
            "orders",
            {"_id": ObjectId(order_id)},
            update_dict
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status"
            )
        updated_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        # Populate user_info and delivery_partner_info
        user_id = updated_order["user"]
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        user = await db.find_one("users", {"_id": user_id})
        if user:
            updated_order["user_info"] = {
                "name": user.get("name", "Unknown"),
                "email": user.get("email", "N/A"),
                "phone": user.get("phone", "N/A")
            }
        else:
            updated_order["user_info"] = {
                "name": "Unknown User",
                "email": "N/A",
                "phone": "N/A"
            }
        partner_id = updated_order.get("delivery_partner")
        if partner_id:
            if isinstance(partner_id, str):
                try:
                    partner_id_obj = ObjectId(partner_id)
                except Exception:
                    partner_id_obj = None
            else:
                partner_id_obj = partner_id
            if partner_id_obj:
                partner = await db.find_one("users", {"_id": partner_id_obj})
                if partner:
                    updated_order["delivery_partner_info"] = {
                        "name": partner.get("name", "Unknown"),
                        "email": partner.get("email", "N/A"),
                        "phone": partner.get("phone", "N/A")
                    }
        return OrderResponse(**updated_order)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update order status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        ) 

@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Delete an order (admin only)"""
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
        existing_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        if not existing_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        # Delete order
        success = await db.delete_one("orders", {"_id": ObjectId(order_id)})
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete order"
            )
        return {"message": "Order deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete order error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete order"
        ) 