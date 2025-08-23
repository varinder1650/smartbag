from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
import logging
from app.services.order_service import OrderService
from app.utils.auth import current_active_user
from db.db_manager import DatabaseManager, get_database
from schema.order import OrderResponse, OrderResponseEnhanced
from schema.user import UserinDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/")
async def create_order(
    order_data: dict,
    current_user: UserinDB = Depends(current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    try:
        logger.info(f"Order creation request from user: {current_user.email}")
        logger.info(f"Order data received: {order_data}")
        
        order_service = OrderService(db)
        order_id = await order_service.create_order(order_data, current_user)
        # print(current_user)
        # print(order_data)
        logger.info(f"Order created successfully with ID: {order_id}")
        
        created_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        created_order['_id'] = str(created_order["_id"])
        created_order["user"] = str(created_order['user'])
        for item in created_order.get("items", []):
            if isinstance(item.get("product"), ObjectId):
                item["product"] = str(item["product"])
        # print(created_order)
        return OrderResponse(**created_order)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create order error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )

@router.get("/my")
async def get_my_orders(
    current_user: UserinDB = Depends(current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    try:
        orders = await db.find_many(
            "orders", 
            {"user": ObjectId(current_user.id)},
            sort=[("created_at", -1)]
        )
        print(orders)
        # enhanced_orders = [await enhance_order_details(order, db) for order in orders]
        
        return [OrderResponseEnhanced(**order) for order in orders]
    except Exception as e:
        logger.error(f"Get my orders error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get orders"
        )