from fastapi import WebSocket
import logging
from datetime import datetime
from admin.utils.serialize import serialize_document
from admin.connection_manager import manager
from bson import ObjectId

logger = logging.getLogger(__name__)

async def send_orders(websocket: WebSocket, filters: dict, db):
    """Send orders based on filters"""
    try:
        # Check if WebSocket is still connected
        if hasattr(websocket, 'client_state') and websocket.client_state.value != 1:
            logger.warning("WebSocket connection is not active, skipping send_orders")
            return
            
        query = {}
        
        # Apply filters
        if filters.get("status"):
            query["order_status"] = filters["status"]
        if filters.get("from_date"):
            query["created_at"] = {"$gte": datetime.fromisoformat(filters["from_date"])}
        if filters.get("to_date"):
            if "created_at" in query:
                query["created_at"]["$lte"] = datetime.fromisoformat(filters["to_date"])
            else:
                query["created_at"] = {"$lte": datetime.fromisoformat(filters["to_date"])}
        
        # Get orders
        orders = await db.find_many("orders", query, sort=[("created_at", -1)], limit=100)
        # print(orders)
        # Serialize orders and add frontend-friendly field mappings
        serialized_orders = []
        for order in orders:
            try:
                # Serialize the order first (handles datetime conversion)
                user = await db.find_one("users", {"_id":order["user"]})
                
                for item in order["items"]:
                    id = ObjectId(item['product'])
                    product = await db.find_one("products",{"_id": id})
                    item["product_name"] = product["name"]
                    item["product_image"] = product["images"]
                
                delivery_partner_name = None
                if order["delivery_partner"]:
                    delivery_partner = await db.find_one("users", {"_id":order["delivery_partner"]})
                    delivery_partner_name = delivery_partner.get("name")
                    order["delivery_partner_name"] = delivery_partner_name
                serialized_order = serialize_document(order)
                # serialized_order["delivery_partner_name"] = delivery_partner['name']
                serialized_order["delivery_partner_name"] = delivery_partner_name
                serialized_order["user_name"] = user["name"]
                serialized_order["user_email"] = user["email"]
                serialized_order["user_phone"] = user["phone"]
                
                # Add frontend-friendly field mappings
                serialized_order["id"] = serialized_order["_id"]  # Add id field
                serialized_order["customer"] = "Customer"  # Placeholder - you can enhance this later
                serialized_order["total"] = serialized_order.get("total_amount", 0)  # Map total_amount to total
                serialized_order["status"] = serialized_order.get("order_status", "pending")  # Map order_status to status
                
                serialized_orders.append(serialized_order)
                
            except Exception as serialize_error:
                logger.error(f"Error serializing order {order.get('_id')}: {serialize_error}")
                continue
        # print(serialized_orders)
        logger.info(f"Sending {len(serialized_orders)} serialized orders")

        await websocket.send_json({
            "type": "orders_data",
            "channel": "orders", 
            "orders": serialized_orders
        })
        
    except Exception as e:
        logger.error(f"Error sending orders: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Failed to fetch orders"
            })
        except:
            logger.info("Could not send error message - client disconnected")

async def update_order_status(websocket: WebSocket, data: dict, user_info: dict, db):
    """Update order status with correct field mappings"""
    try:
        # Handle both orderId and order_id from frontend
        order_id = data.get("order_id") or data.get("orderId") 
        new_status = data.get("status")
        delivery_partner = data.get("delivery_partner")
        notes = data.get("notes", "")
        
        if not order_id or not new_status:
            await websocket.send_json({
                "type": "error", 
                "message": "Order ID and status are required"
            })
            return
        
        # Update with correct database field names
        update_data = {
            "order_status": new_status,  # Database uses order_status
            "updated_at": datetime.utcnow(),
        }
        
        if delivery_partner:
            update_data["delivery_partner"] = delivery_partner
            
        # Update order
        result = await db.update_one(
            "orders",
            {"_id": ObjectId(order_id)}, 
            {"$set": update_data}
        )
        
        if result:
            # Get updated order and transform for frontend
            updated_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
            serialized_order = serialize_document(updated_order)
            
            # Map fields for frontend
            serialized_order["id"] = serialized_order["_id"]
            serialized_order["total"] = serialized_order.get("total_amount", 0)
            serialized_order["status"] = serialized_order.get("order_status", "pending")
            
            await websocket.send_json({
                "type": "order_status_updated",
                "order": serialized_order
            })
        
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to update order status: {str(e)}"
        })

async def get_delivery_requests_for_order(websocket: WebSocket,data:dict, db):
    try:
        order_id = ObjectId(data.get("order_id"))
        order = await db.find_one("orders", {"_id": order_id})
        partners = order["accepted_partners"]
        partner_list = []

        for partner in partners:
            partner_data = await db.find_one("users",{"_id": partner})
            partner_list.append({
                "id": str(partner_data["_id"]),
                "name": partner_data["name"]
            })

        await websocket.send_json({
            "type": "delivery_requests_data",
            "delivery_requests": partner_list
        })
    except Exception as e:
        logger.error(f"Not able to get the requested partners: {e}")
        raise e

async def assign_delivery_partner(websocket:WebSocket,data: dict,db):
    try:
        order_id = data.get("order_id")
        partner_id = data.get("delivery_partner_id")

        order = await db.update_one("orders", {"_id": ObjectId(order_id)},{"delivery_partner": ObjectId(partner_id), "order_status": "assigned"})
        if not order:
            logger.error("Failed to assign")
            await websocket.send_json({
                "type": "order_assigned",
                "success": False,
                "data":{
                    "order_id": order_id
                }
            })
        
        logger.info("Successfully assigned")
        await websocket.send_json({
                "type": "order_assigned",
                "success": False,
                "data":{
                    "order_id": order_id
                }
            })
    except Exception as e:
        logger.error(f"failed to assign : {e}")
        raise e