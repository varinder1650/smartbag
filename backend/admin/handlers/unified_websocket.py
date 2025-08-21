from fastapi import WebSocket, WebSocketDisconnect, status
from admin.connection_manager import manager
from admin.auth import verify_admin_token, authenticate_admin
from db.db_manager import get_database
import logging
from admin.handlers.products import send_products, create_product, delete_product, update_product
from admin.handlers.brand import send_brands, create_brand, update_brand, delete_brand
from admin.handlers.orders import send_orders
from admin.handlers.category import send_categories, create_categories, update_category, delete_category
from admin.handlers.customers import send_customers
from admin.handlers.auth import (
    handle_get_users, 
    handle_update_user_role, 
    handle_update_user_status
)
from admin.handlers.settings import (
    send_inventory_status, 
    handle_get_analytics, 
    handle_get_pricing_config, 
    handle_update_pricing_config
)

logger = logging.getLogger(__name__)

async def admin_websocket_handler(websocket: WebSocket):
    """Single WebSocket endpoint for all admin functionality"""
    await websocket.accept()
    
    user_info = None
    authenticated = False
    
    try:
        # Authentication phase
        auth_message = await websocket.receive_json()
        print(f"Auth message received: {auth_message}")
        
        if auth_message.get("email") and auth_message.get("password"):
            # Initial login
            user_info = await authenticate_admin(auth_message)
        elif auth_message.get("token"):
            # Reconnection with token
            user_info = await verify_admin_token(auth_message["token"])
        
        if not user_info:
            await websocket.send_json({"type": "error", "message": "Authentication failed"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # 🔍 DEBUG: Log user_info structure
        logger.info(f"=== AUTHENTICATION SUCCESS ===")
        logger.info(f"user_info type: {type(user_info)}")
        logger.info(f"user_info content: {user_info}")
        logger.info(f"user_info keys: {list(user_info.keys()) if isinstance(user_info, dict) else 'Not a dict'}")
        logger.info(f"=== END AUTHENTICATION DEBUG ===")
        
        # Register connection
        await manager.connect(websocket, user_info)
        authenticated = True
        
        # Send success response
        await websocket.send_json({
            "type": "auth_success",
            "user": user_info
        })
        
        # Main message handling loop
        await handle_admin_messages(websocket, user_info)
        
    except WebSocketDisconnect:
        if authenticated and user_info:
            manager.disconnect(websocket)
            logger.info(f"Admin {user_info.get('email', 'unknown')} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if authenticated:
            manager.disconnect(websocket)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

async def handle_admin_messages(websocket: WebSocket, user_info: dict):
    """Handle all admin messages through unified connection"""
    
    db = get_database()
    subscriptions = set()
    
    # 🔍 DEBUG: Log user_info at start of message handling
    logger.info(f"=== MESSAGE HANDLER STARTED ===")
    logger.info(f"user_info for message handling: {user_info}")
    logger.info(f"=== END MESSAGE HANDLER DEBUG ===")
    
    while True:
        try:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            
            logger.info(f"Received message type: {msg_type} from {user_info.get('email', 'unknown')}")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif msg_type == "subscribe":
                channel = message.get("channel")
                if channel in ["products", "orders", "customers", "brands", "categories", "users"]:
                    subscriptions.add(channel)
                    await manager.subscribe(websocket, channel)
                    await send_initial_data(websocket, channel, db)
            
            elif msg_type == "unsubscribe":
                channel = message.get("channel")
                subscriptions.discard(channel)
                await manager.unsubscribe(websocket, channel)
            
            # Products handlers
            elif msg_type == "get_products":
                await send_products(websocket, db)
            
            elif msg_type == "create_product":
                await create_product(websocket, message.get("data"), user_info, db)
            
            elif msg_type == "update_product":
                await update_product(websocket, message.get("data"), user_info, db)
            
            elif msg_type == "delete_product":
                await delete_product(websocket, message.get("data"), user_info, db)
           
            # Orders handlers
            elif msg_type == "get_orders":
                await send_orders(websocket, message.get("filters", {}), db)
            
            # Categories handlers
            elif msg_type == "get_categories":
                await send_categories(websocket, db)
            
            elif msg_type == "create_category":
                await create_categories(websocket, message.get("data"), user_info, db)

            elif msg_type == "update_category":
                await update_category(websocket, message.get("data"), user_info, db)
            
            elif msg_type == "delete_category":
                await delete_category(websocket, message.get("data"), user_info, db)
                
            # Brands handlers
            elif msg_type == "get_brands":
                await send_brands(websocket, db)
            
            elif msg_type == "create_brand":
                await create_brand(websocket, message.get("data"), user_info, db)

            elif msg_type == "update_brand":
                await update_brand(websocket, message.get("data"), user_info, db)
            
            elif msg_type == "delete_brand":
                await delete_brand(websocket, message.get("data"), user_info, db)

            # Users handlers - ✅ NOW IMPLEMENTED
            elif msg_type == "get_users":
                await handle_get_users(websocket, message.get("filters", {}), db)

            elif msg_type == "update_user_role":
                await handle_update_user_role(websocket, message.get("data"), user_info, db)

            elif msg_type == "update_user_status":
                await handle_update_user_status(websocket, message.get("data"), user_info, db)

            # Analytics handlers
            elif msg_type == "get_analytics":
                await handle_get_analytics(websocket, message.get("data", {}), db)

            # Pricing handlers
            elif msg_type == "get_pricing_config":
                await handle_get_pricing_config(websocket, db)
                
            elif msg_type == "update_pricing_config":
                await handle_update_pricing_config(websocket, message.get("data"), user_info, db)

            # Settings handlers
            elif msg_type == "get_inventory_status":
                await send_inventory_status(websocket, db)

            # Customers handlers
            elif msg_type == "get_customers":
                await send_customers(websocket, db)

            elif msg_type == "logout":
                break

            # ✅ Order status handler (placeholder for future implementation)
            elif msg_type == "update_order_status":
                await websocket.send_json({
                    "type": "info",
                    "message": "Order status update feature coming soon"
                })

            else:
                logger.warning(f"Unknown message type: {msg_type}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}"
                })
                
        except WebSocketDisconnect:
            logger.info(f"Admin {user_info.get('email', 'unknown')} disconnected during message handling")
            break
        except Exception as e:
            logger.error(f"Error handling message {msg_type}: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Internal server error: {str(e)}"
                })
            except:
                # Connection might be closed
                break

async def send_initial_data(websocket: WebSocket, channel: str, db):
    """Send initial data when subscribing to a channel"""
    try:
        logger.info(f"Sending initial data for channel: {channel}")
        
        if channel == "products":
            await send_products(websocket, db)
        elif channel == "orders":
            await send_orders(websocket, {}, db)
        elif channel == "inventory":
            await send_inventory_status(websocket, db)
        elif channel == "customers":
            await send_customers(websocket, db)
        elif channel == "brands":
            await send_brands(websocket, db)
        elif channel == "categories":
            await send_categories(websocket, db)
        elif channel == "users":
            await handle_get_users(websocket, {}, db)
            
    except Exception as e:
        logger.error(f"Error sending initial data for {channel}: {e}")
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to load {channel} data"
        })