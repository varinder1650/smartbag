from fastapi import WebSocket
import logging
from datetime import datetime, timedelta
from admin.utils.serialize import serialize_document

logger = logging.getLogger(__name__)

async def send_inventory_status(websocket: WebSocket, db):
    """Send inventory status"""
    try:
        low_stock_products = await db.find_many(
            "products",
            {"stock": {"$lt": 10}},
            sort=[("stock", 1)]
        )
        
        serialized_products = [serialize_document(product) for product in low_stock_products]
        
        await websocket.send_json({
            "type": "inventory_status",
            "low_stock_products": serialized_products,
            "total_products": await db.count_documents("products", {})
        })
    except Exception as e:
        logger.error(f"Error sending inventory status: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Failed to fetch inventory status"
        })

async def handle_get_analytics(websocket: WebSocket, data: dict, db):
    """Get analytics data"""
    try:
        period = data.get("period", "week")
        
        # Calculate date range
        end_date = datetime.utcnow()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=7)

        # Get basic counts
        total_orders = await db.count_documents("orders", {
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        total_products = await db.count_documents("products", {})
        total_users = await db.count_documents("users", {"role": "customer"})
        
        # Calculate revenue from delivered orders
        delivered_orders = await db.find_many("orders", {
            "created_at": {"$gte": start_date, "$lte": end_date},
            "status": "delivered"
        })
        
        total_revenue = sum(order.get("total", 0) for order in delivered_orders)
        
        analytics = {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_products": total_products,
            "total_users": total_users,
        }
        
        await websocket.send_json({
            "type": "analytics_data",
            "analytics": analytics
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Failed to fetch analytics"
        })

async def handle_get_pricing_config(websocket: WebSocket, db):
    """Get current pricing configuration"""
    try:
        # Try to get existing pricing config
        pricing_config = await db.find_one("pricing_config", {"active": True})
        
        if not pricing_config:
            # Create default config if none exists
            default_config = {
                "deliveryFee": {
                    "type": "fixed",
                    "baseFee": 5.00,
                    "perKmRate": 1.50,
                    "minFee": 3.00,
                    "maxFee": 25.00,
                    "freeDeliveryThreshold": 50.00,
                },
                "appFee": {
                    "type": "percentage",
                    "value": 15.0,
                    "minFee": 1.00,
                    "maxFee": 20.00,
                },
                "active": True,
                "created_at": datetime.utcnow(),
                "created_by": "system"
            }
            
            await db.insert_one("pricing_config", default_config)
            pricing_config = default_config
        
        pricing_config = serialize_document(pricing_config)
        
        await websocket.send_json({
            "type": "pricing_config",
            "config": pricing_config
        })
        
    except Exception as e:
        logger.error(f"Error getting pricing config: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Failed to fetch pricing configuration"
        })

async def handle_update_pricing_config(websocket: WebSocket, data: dict, user_info: dict, db):
    """Update pricing configuration"""
    try:
        config_data = data.get("data", {})
        
        # Add metadata
        config_data.update({
            "active": True,
            "updated_at": datetime.utcnow(),
            "updated_by": user_info["email"]
        })
        
        # Update or create pricing config
        result = await db.update_one(
            "pricing_config",
            {"active": True},
            {"$set": config_data},
            upsert=True
        )
        
        if result:
            await websocket.send_json({
                "type": "pricing_updated",
                "message": "Pricing configuration updated successfully"
            })
        else:
            await websocket.send_json({
                "type": "error",
                "message": "Failed to update pricing configuration"
            })
            
    except Exception as e:
        logger.error(f"Error updating pricing config: {e}")
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to update pricing: {str(e)}"
        })