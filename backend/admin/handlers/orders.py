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
        
        # Serialize orders and add frontend-friendly field mappings
        serialized_orders = []
        for order in orders:
            try:
                # Serialize the order first (handles datetime conversion)
                serialized_order = serialize_document(order)
                
                # Add frontend-friendly field mappings
                serialized_order["id"] = serialized_order["_id"]  # Add id field
                serialized_order["customer"] = "Customer"  # Placeholder - you can enhance this later
                serialized_order["total"] = serialized_order.get("total_amount", 0)  # Map total_amount to total
                serialized_order["status"] = serialized_order.get("order_status", "pending")  # Map order_status to status
                
                serialized_orders.append(serialized_order)
                
            except Exception as serialize_error:
                logger.error(f"Error serializing order {order.get('_id')}: {serialize_error}")
                continue
        
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

# async def update_delivery_partner_stats(partner_id: ObjectId, db):
#     """Update delivery partner statistics"""
#     try:
#         await db.update_one(
#             "delivery_partners",
#             {"user_id": partner_id},
#             {
#                 "$inc": {"completed_deliveries": 1},
#                 "$pull": {"assigned_orders": {"$in": [partner_id]}}
#             }
#         )
#     except Exception as e:
#         logger.error(f"Error updating delivery partner stats: {e}")

# async def handle_get_order_details(websocket: WebSocket, data: dict, db):
#     """Get detailed order information"""
#     try:
#         order_id = data.get("order_id")
        
#         if not order_id:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order ID is required"
#             })
#             return
        
#         # Get order with user and product details
#         order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        
#         if not order:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order not found"
#             })
#             return
        
#         # Get user details
#         user = await db.find_one("users", {"_id": order["user_id"]})
#         if user:
#             user.pop("hashed_password", None)
#             order["user"] = serialize_document(user)
        
#         # Get product details for each item
#         for item in order.get("items", []):
#             product = await db.find_one("products", {"_id": item["product_id"]})
#             if product:
#                 item["product"] = serialize_document(product)
        
#         # Get delivery partner details if assigned
#         if order.get("delivery_partner_id"):
#             partner = await db.find_one("users", {"_id": order["delivery_partner_id"]})
#             if partner:
#                 partner.pop("hashed_password", None)
#                 order["delivery_partner"] = serialize_document(partner)
        
#         # Get delivery requests
#         delivery_requests = await db.find_many(
#             "delivery_requests",
#             {"order_id": ObjectId(order_id)},
#             sort=[("requested_at", -1)]
#         )
        
#         # Get partner details for each request
#         for request in delivery_requests:
#             partner = await db.find_one("users", {"_id": request["partner_id"]})
#             if partner:
#                 partner.pop("hashed_password", None)
#                 request["partner"] = serialize_document(partner)
#             request = serialize_document(request)
        
#         order["delivery_requests"] = delivery_requests
#         order = serialize_document(order)
        
#         await websocket.send_json({
#             "type": "order_details",
#             "order": order
#         })
        
#     except Exception as e:
#         logger.error(f"Error getting order details: {e}")
#         await websocket.send_json({
#             "type": "error",
#             "message": "Failed to fetch order details"
#         })

# async def handle_delivery_request(websocket: WebSocket, data: dict, user_info: dict, db):
#     """Handle delivery partner request for order assignment"""
#     try:
#         order_id = data.get("order_id")
#         partner_id = data.get("partner_id")
        
#         if not order_id or not partner_id:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order ID and partner ID are required"
#             })
#             return
        
#         # Check if order exists and is ready for delivery
#         order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        
#         if not order:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order not found"
#             })
#             return
        
#         if order["status"] not in ["confirmed", "prepared"]:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order is not ready for delivery assignment"
#             })
#             return
        
#         if order.get("delivery_partner_id"):
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order already assigned to a delivery partner"
#             })
#             return
        
#         # Create delivery request
#         delivery_request = {
#             "order_id": ObjectId(order_id),
#             "partner_id": ObjectId(partner_id),
#             "requested_at": datetime.utcnow(),
#             "status": "pending",
#             "notes": data.get("notes", "")
#         }
        
#         await db.insert_one("delivery_requests", delivery_request)
        
#         # Notify admins about new delivery request
#         await manager.broadcast_to_channel("orders", {
#             "type": "new_delivery_request",
#             "order_id": str(order_id),
#             "partner_id": str(partner_id),
#             "requested_at": delivery_request["requested_at"].isoformat()
#         })
        
#         await websocket.send_json({
#             "type": "delivery_request_submitted",
#             "order_id": str(order_id)
#         })
        
#     except Exception as e:
#         logger.error(f"Error handling delivery request: {e}")
#         await websocket.send_json({
#             "type": "error",
#             "message": "Failed to submit delivery request"
#         })

# async def handle_assign_delivery_partner(websocket: WebSocket, data: dict, user_info: dict, db):
#     """Assign order to a delivery partner"""
#     try:
#         order_id = data.get("order_id")
#         partner_id = data.get("partner_id")
        
#         if not order_id or not partner_id:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order ID and partner ID are required"
#             })
#             return
        
#         # Update order with delivery partner
#         result = await db.update_one(
#             "orders",
#             {"_id": ObjectId(order_id)},
#             {
#                 "$set": {
#                     "delivery_partner_id": ObjectId(partner_id),
#                     "status": "out_for_delivery",
#                     "assigned_at": datetime.utcnow(),
#                     "assigned_by": user_info["email"],
#                     "updated_at": datetime.utcnow()
#                 }
#             }
#         )
        
#         if result:
#             # Update delivery request status
#             await db.update_many(
#                 "delivery_requests",
#                 {"order_id": ObjectId(order_id)},
#                 {
#                     "$set": {
#                         "status": "processed",
#                         "processed_at": datetime.utcnow()
#                     }
#                 }
#             )
            
#             # Update the selected partner's request
#             await db.update_one(
#                 "delivery_requests",
#                 {
#                     "order_id": ObjectId(order_id),
#                     "partner_id": ObjectId(partner_id)
#                 },
#                 {"$set": {"status": "accepted"}}
#             )
            
#             # Add to partner's assigned orders
#             await db.update_one(
#                 "delivery_partners",
#                 {"user_id": ObjectId(partner_id)},
#                 {
#                     "$push": {"assigned_orders": ObjectId(order_id)},
#                     "$set": {"updated_at": datetime.utcnow()}
#                 }
#             )
            
#             # Get updated order
#             order = await db.find_one("orders", {"_id": ObjectId(order_id)})
#             order = serialize_document(order)
            
#             await websocket.send_json({
#                 "type": "delivery_assigned",
#                 "order": order
#             })
            
#             # Notify all admins and the delivery partner
#             await manager.broadcast_to_channel("orders", {
#                 "type": "order_assigned",
#                 "order_id": str(order_id),
#                 "partner_id": str(partner_id),
#                 "assigned_by": user_info["email"]
#             })
            
#             # TODO: Send notification to delivery partner
            
#         else:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Failed to assign delivery partner"
#             })
            
#     except Exception as e:
#         logger.error(f"Error assigning delivery partner: {e}")
#         await websocket.send_json({
#             "type": "error",
#             "message": f"Failed to assign delivery: {str(e)}"
#         })

# async def handle_update_order_status(websocket: WebSocket, data: dict, user_info: dict, db):
#     """Update order status with validation"""
#     try:
#         order_id = data.get("order_id")
#         new_status = data.get("status")
#         notes = data.get("notes", "")
        
#         if not order_id or not new_status:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order ID and status are required"
#             })
#             return
        
#         # Define valid status transitions
#         valid_statuses = [
#             "pending", "confirmed", "preparing", "prepared", 
#             "out_for_delivery", "delivered", "cancelled", "refunded"
#         ]
        
#         if new_status not in valid_statuses:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
#             })
#             return
        
#         # Get current order
#         order = await db.find_one("orders", {"_id": ObjectId(order_id)})
        
#         if not order:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Order not found"
#             })
#             return
        
#         old_status = order.get("status")
        
#         # Validate status transition
#         if not is_valid_status_transition(old_status, new_status):
#             await websocket.send_json({
#                 "type": "error",
#                 "message": f"Invalid status transition from {old_status} to {new_status}"
#             })
#             return
        
#         # Create status history entry
#         status_update = {
#             "from_status": old_status,
#             "to_status": new_status,
#             "changed_at": datetime.utcnow(),
#             "changed_by": user_info["email"],
#             "notes": notes
#         }
        
#         # Update order
#         update_data = {
#             "status": new_status,
#             "updated_at": datetime.utcnow(),
#             "$push": {"status_history": status_update}
#         }
        
#         # Add specific fields based on status
#         if new_status == "delivered":
#             update_data["delivered_at"] = datetime.utcnow()
#         elif new_status == "cancelled":
#             update_data["cancelled_at"] = datetime.utcnow()
#             update_data["cancelled_by"] = user_info["email"]
#             update_data["cancellation_reason"] = notes
        
#         result = await db.update_one(
#             "orders",
#             {"_id": ObjectId(order_id)},
#             update_data
#         )
        
#         if result:
#             # Get updated order
#             updated_order = await db.find_one("orders", {"_id": ObjectId(order_id)})
#             updated_order = serialize_document(updated_order)
            
#             await websocket.send_json({
#                 "type": "order_status_updated",
#                 "order": updated_order
#             })
            
#             # Broadcast to all admins
#             await manager.broadcast_to_channel("orders", {
#                 "type": "order_status_changed",
#                 "order_id": str(order_id),
#                 "old_status": old_status,
#                 "new_status": new_status,
#                 "updated_by": user_info["email"]
#             })
            
#             # Update delivery partner stats if delivered
#             if new_status == "delivered" and order.get("delivery_partner_id"):
#                 await update_delivery_partner_stats(order["delivery_partner_id"], db)
                
#         else:
#             await websocket.send_json({
#                 "type": "error",
#                 "message": "Failed to update order status"
#             })
            
#     except Exception as e:
#         logger.error(f"Error updating order status: {e}")
#         await websocket.send_json({
#             "type": "error",
#             "message": f"Failed to update status: {str(e)}"
#         })