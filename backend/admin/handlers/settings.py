# from fastapi import WebSocket
# import logging

# logger = logging.getLogger(__name__)

# async def send_inventory_status(websocket: WebSocket, db):
#     """Send inventory status"""
#     try:
#         # Add filter dict
#         low_stock_products = await db.find_many(
#             "products",
#             {"stock": {"$lt": 10}},  # This one already has a filter
#             sort=[("stock", 1)]
#         )
        
#         for product in low_stock_products:
#             product['_id'] = str(product['_id'])
        
#         await websocket.send_json({
#             "type": "inventory_status",
#             "low_stock_products": low_stock_products,
#             "total_products": await db.count_documents("products", {})
#         })
#     except Exception as e:
#         logger.error(f"Error sending inventory status: {e}")


# # async def handle_get_pricing_config(websocket: WebSocket, db):
# #     """Get current pricing configuration"""
# #     try:
# #         # Get pricing config
# #         pricing_config = await db.find_one("pricing_config", {"active": True})
        
# #         if not pricing_config:
# #             # Create default config if none exists
# #             pricing_config = {
# #                 "delivery_fee": {
# #                     "type": "fixed",  # fixed, distance_based, order_value_based
# #                     "base_fee": 5.00,
# #                     "per_km_rate": 1.50,
# #                     "min_fee": 3.00,
# #                     "max_fee": 25.00,
# #                     "free_delivery_threshold": 50.00,  # Free delivery for orders above this amount
# #                     "peak_hours_multiplier": 1.5,
# #                     "peak_hours": [
# #                         {"start": "11:00", "end": "14:00"},
# #                         {"start": "18:00", "end": "21:00"}
# #                     ]
# #                 },
# #                 "app_fee": {
# #                     "type": "percentage",  # fixed, percentage, tiered
# #                     "percentage": 15.0,  # 15% of order value
# #                     "fixed_amount": 2.00,
# #                     "min_fee": 1.00,
# #                     "max_fee": 20.00,
# #                     "tiered_rates": [
# #                         {"min_order": 0, "max_order": 20, "rate": 20.0},
# #                         {"min_order": 20, "max_order": 50, "rate": 15.0},
# #                         {"min_order": 50, "max_order": 100, "rate": 10.0},
# #                         {"min_order": 100, "max_order": None, "rate": 5.0}
# #                     ]
# #                 },
# #                 "vendor_commission": {
# #                     "type": "percentage",
# #                     "percentage": 20.0,  # Platform takes 20% from vendors
# #                     "min_commission": 1.00
# #                 },
# #                 "promotions": {
# #                     "first_order_discount": {
# #                         "enabled": True,
# #                         "discount_percentage": 20.0,
# #                         "max_discount": 10.00
# #                     },
# #                     "referral_discount": {
# #                         "enabled": True,
# #                         "referrer_credit": 5.00,
# #                         "referee_discount": 5.00
# #                     }
# #                 },
# #                 "tax_rate": 8.5,  # 8.5% tax
# #                 "active": True,
# #                 "created_at": datetime.utcnow(),
# #                 "created_by": "system"
# #             }
            
# #             await db.insert_one("pricing_config", pricing_config)
        
# #         pricing_config = serialize_document(pricing_config)
        
# #         # Get pricing history
# #         pricing_history = await db.find_many(
# #             "pricing_history",
# #             {},
# #             sort=[("created_at", -1)],
# #             limit=10
# #         )
        
# #         pricing_history = [serialize_document(record) for record in pricing_history]
        
# #         await websocket.send_json({
# #             "type": "pricing_config",
# #             "config": pricing_config,
# #             "history": pricing_history
# #         })
        
# #     except Exception as e:
# #         logger.error(f"Error getting pricing config: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": "Failed to fetch pricing configuration"
# #         })

# # async def handle_update_delivery_pricing(websocket: WebSocket, data: dict, user_info: dict, db):
# #     """Update delivery fee configuration"""
# #     try:
# #         delivery_config = data.get("delivery_config")
        
# #         if not delivery_config:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "Delivery configuration is required"
# #             })
# #             return
        
# #         # Validate configuration
# #         if delivery_config.get("type") not in ["fixed", "distance_based", "order_value_based"]:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "Invalid delivery fee type"
# #             })
# #             return
        
# #         # Get current config
# #         current_config = await db.find_one("pricing_config", {"active": True})
        
# #         if not current_config:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "No active pricing configuration found"
# #             })
# #             return
        
# #         # Create history record
# #         history_record = {
# #             "config_type": "delivery_fee",
# #             "old_config": current_config.get("delivery_fee"),
# #             "new_config": delivery_config,
# #             "changed_by": user_info["email"],
# #             "changed_at": datetime.utcnow(),
# #             "reason": data.get("reason", "")
# #         }
        
# #         await db.insert_one("pricing_history", history_record)
        
# #         # Update configuration
# #         result = await db.update_one(
# #             "pricing_config",
# #             {"active": True},
# #             {
# #                 "$set": {
# #                     "delivery_fee": delivery_config,
# #                     "updated_at": datetime.utcnow(),
# #                     "updated_by": user_info["email"]
# #                 }
# #             }
# #         )
        
# #         if result:
# #             # Get updated config
# #             updated_config = await db.find_one("pricing_config", {"active": True})
# #             updated_config = serialize_document(updated_config)
            
# #             await websocket.send_json({
# #                 "type": "delivery_pricing_updated",
# #                 "config": updated_config["delivery_fee"]
# #             })
            
# #             # Broadcast to all admins
# #             await manager.broadcast_to_channel("pricing", {
# #                 "type": "pricing_updated",
# #                 "section": "delivery_fee",
# #                 "updated_by": user_info["email"]
# #             })
            
# #             # Calculate impact on active orders
# #             impact = await calculate_pricing_impact(db, "delivery")
            
# #             await websocket.send_json({
# #                 "type": "pricing_impact",
# #                 "affected_orders": impact["order_count"],
# #                 "revenue_difference": impact["revenue_difference"]
# #             })
            
# #         else:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "Failed to update delivery pricing"
# #             })
            
# #     except Exception as e:
# #         logger.error(f"Error updating delivery pricing: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": f"Failed to update pricing: {str(e)}"
# #         })

# # async def handle_update_app_fee(websocket: WebSocket, data: dict, user_info: dict, db):
# #     """Update app fee configuration"""
# #     try:
# #         app_fee_config = data.get("app_fee_config")
        
# #         if not app_fee_config:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "App fee configuration is required"
# #             })
# #             return
        
# #         # Validate configuration
# #         if app_fee_config.get("type") not in ["fixed", "percentage", "tiered"]:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "Invalid app fee type"
# #             })
# #             return
        
# #         # Get current config
# #         current_config = await db.find_one("pricing_config", {"active": True})
        
# #         # Create history record
# #         history_record = {
# #             "config_type": "app_fee",
# #             "old_config": current_config.get("app_fee"),
# #             "new_config": app_fee_config,
# #             "changed_by": user_info["email"],
# #             "changed_at": datetime.utcnow(),
# #             "reason": data.get("reason", "")
# #         }
        
# #         await db.insert_one("pricing_history", history_record)
        
# #         # Update configuration
# #         result = await db.update_one(
# #             "pricing_config",
# #             {"active": True},
# #             {
# #                 "$set": {
# #                     "app_fee": app_fee_config,
# #                     "updated_at": datetime.utcnow(),
# #                     "updated_by": user_info["email"]
# #                 }
# #             }
# #         )
        
# #         if result:
# #             # Get updated config
# #             updated_config = await db.find_one("pricing_config", {"active": True})
# #             updated_config = serialize_document(updated_config)
            
# #             await websocket.send_json({
# #                 "type": "app_fee_updated",
# #                 "config": updated_config["app_fee"]
# #             })
            
# #             # Broadcast to all admins
# #             await manager.broadcast_to_channel("pricing", {
# #                 "type": "pricing_updated",
# #                 "section": "app_fee",
# #                 "updated_by": user_info["email"]
# #             })
            
# #             # Calculate revenue impact
# #             impact = await calculate_pricing_impact(db, "app_fee")
            
# #             await websocket.send_json({
# #                 "type": "revenue_impact",
# #                 "daily_revenue_change": impact["daily_change"],
# #                 "monthly_projection": impact["monthly_projection"]
# #             })
            
# #         else:
# #             await websocket.send_json({
# #                 "type": "error",
# #                 "message": "Failed to update app fee"
# #             })
            
# #     except Exception as e:
# #         logger.error(f"Error updating app fee: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": f"Failed to update app fee: {str(e)}"
# #         })

# # async def handle_simulate_pricing(websocket: WebSocket, data: dict, db):
# #     """Simulate pricing changes before applying"""
# #     try:
# #         order_amount = data.get("order_amount", 50.0)
# #         distance = data.get("distance", 5.0)
# #         delivery_config = data.get("delivery_config")
# #         app_fee_config = data.get("app_fee_config")
        
# #         # Get current config if not provided
# #         current_config = await db.find_one("pricing_config", {"active": True})
        
# #         if not delivery_config:
# #             delivery_config = current_config.get("delivery_fee")
        
# #         if not app_fee_config:
# #             app_fee_config = current_config.get("app_fee")
        
# #         # Calculate fees
# #         delivery_fee = calculate_delivery_fee(order_amount, distance, delivery_config)
# #         app_fee = calculate_app_fee(order_amount, app_fee_config)
        
# #         # Calculate with current config for comparison
# #         current_delivery = calculate_delivery_fee(
# #             order_amount, 
# #             distance, 
# #             current_config.get("delivery_fee")
# #         )
# #         current_app = calculate_app_fee(
# #             order_amount, 
# #             current_config.get("app_fee")
# #         )
        
# #         simulation = {
# #             "order_amount": order_amount,
# #             "distance": distance,
# #             "new_pricing": {
# #                 "delivery_fee": delivery_fee,
# #                 "app_fee": app_fee,
# #                 "total_fees": delivery_fee + app_fee,
# #                 "customer_total": order_amount + delivery_fee + app_fee
# #             },
# #             "current_pricing": {
# #                 "delivery_fee": current_delivery,
# #                 "app_fee": current_app,
# #                 "total_fees": current_delivery + current_app,
# #                 "customer_total": order_amount + current_delivery + current_app
# #             },
# #             "difference": {
# #                 "delivery_fee": delivery_fee - current_delivery,
# #                 "app_fee": app_fee - current_app,
# #                 "total": (delivery_fee + app_fee) - (current_delivery + current_app)
# #             }
# #         }
        
# #         await websocket.send_json({
# #             "type": "pricing_simulation",
# #             "simulation": simulation
# #         })
        
# #     except Exception as e:
# #         logger.error(f"Error simulating pricing: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": "Failed to simulate pricing"
# #         })

# # def calculate_delivery_fee(order_amount: float, distance: float, config: dict) -> float:
# #     """Calculate delivery fee based on configuration"""
# #     fee = 0.0
    
# #     # Check if free delivery applies
# #     if order_amount >= config.get("free_delivery_threshold", 0):
# #         return 0.0
    
# #     if config["type"] == "fixed":
# #         fee = config.get("base_fee", 5.0)
        
# #     elif config["type"] == "distance_based":
# #         base = config.get("base_fee", 3.0)
# #         per_km = config.get("per_km_rate", 1.5)
# #         fee = base + (distance * per_km)
        
# #     elif config["type"] == "order_value_based":
# #         # Percentage of order value
# #         percentage = config.get("percentage", 10.0)
# #         fee = order_amount * (percentage / 100)
    
# #     # Apply min/max limits
# #     min_fee = config.get("min_fee", 0)
# #     max_fee = config.get("max_fee", float('inf'))
# #     fee = max(min_fee, min(fee, max_fee))
    
# #     # Check for peak hours (simplified - in production, check actual time)
# #     # if is_peak_hour():
# #     #     fee *= config.get("peak_hours_multiplier", 1.0)
    
# #     return round(fee, 2)

# # def calculate_app_fee(order_amount: float, config: dict) -> float:
# #     """Calculate app fee based on configuration"""
# #     fee = 0.0
    
# #     if config["type"] == "fixed":
# #         fee = config.get("fixed_amount", 2.0)
        
# #     elif config["type"] == "percentage":
# #         percentage = config.get("percentage", 15.0)
# #         fee = order_amount * (percentage / 100)
        
# #     elif config["type"] == "tiered":
# #         # Find applicable tier
# #         tiers = config.get("tiered_rates", [])
# #         for tier in tiers:
# #             min_order = tier.get("min_order", 0)
# #             max_order = tier.get("max_order", float('inf'))
            
# #             if min_order <= order_amount <= (max_order or float('inf')):
# #                 rate = tier.get("rate", 10.0)
# #                 fee = order_amount * (rate / 100)
# #                 break
    
# #     # Apply min/max limits
# #     min_fee = config.get("min_fee", 0)
# #     max_fee = config.get("max_fee", float('inf'))
# #     fee = max(min_fee, min(fee, max_fee))
    
# #     return round(fee, 2)

# # async def calculate_pricing_impact(db, pricing_type: str) -> dict:
# #     """Calculate the impact of pricing changes on revenue"""
# #     # This is a simplified calculation
# #     # In production, you'd analyze actual order data
    
# #     # Get recent orders
# #     recent_orders = await db.find_many(
# #         "orders",
# #         {
# #             "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)},
# #             "status": {"$in": ["delivered", "out_for_delivery"]}
# #         }
# #     )
    
# #     total_impact = 0.0
    
# #     for order in recent_orders:
# #         # Calculate difference based on new vs old pricing
# #         # This is a placeholder - implement actual calculation
# #         total_impact += 0  # Calculate actual impact
    
# #     return {
# #         "order_count": len(recent_orders),
# #         "revenue_difference": total_impact,
# #         "daily_change": total_impact / 7,
# #         "monthly_projection": (total_impact / 7) * 30
# #     }

# # # Add pricing analytics
# # async def handle_get_pricing_analytics(websocket: WebSocket, data: dict, db):
# #     """Get pricing analytics and revenue data"""
# #     try:
# #         period = data.get("period", "week")  # week, month, quarter
        
# #         # Calculate date range
# #         end_date = datetime.utcnow()
# #         if period == "week":
# #             start_date = end_date - timedelta(days=7)
# #         elif period == "month":
# #             start_date = end_date - timedelta(days=30)
# #         else:  # quarter
# #             start_date = end_date - timedelta(days=90)
        
# #         # Aggregate revenue data
# #         pipeline = [
# #             {
# #                 "$match": {
# #                     "created_at": {"$gte": start_date, "$lte": end_date},
# #                     "status": {"$in": ["delivered", "out_for_delivery"]}
# #                 }
# #             },
# #             {
# #                 "$group": {
# #                     "_id": {
# #                         "$dateToString": {
# #                             "format": "%Y-%m-%d",
# #                             "date": "$created_at"
# #                         }
# #                     },
# #                     "total_orders": {"$sum": 1},
# #                     "order_revenue": {"$sum": "$total_amount"},
# #                     "delivery_fees": {"$sum": "$delivery_fee"},
# #                     "app_fees": {"$sum": "$app_fee"},
# #                     "total_revenue": {
# #                         "$sum": {
# #                             "$add": ["$total_amount", "$delivery_fee", "$app_fee"]
# #                         }
# #                     }
# #                 }
# #             },
# #             {"$sort": {"_id": 1}}
# #         ]
        
# #         daily_revenue = await db.aggregate("orders", pipeline)
        
# #         # Calculate totals
# #         totals = {
# #             "total_orders": sum(day["total_orders"] for day in daily_revenue),
# #             "order_revenue": sum(day["order_revenue"] for day in daily_revenue),
# #             "delivery_fees": sum(day["delivery_fees"] for day in daily_revenue),
# #             "app_fees": sum(day["app_fees"] for day in daily_revenue),
# #             "total_revenue": sum(day["total_revenue"] for day in daily_revenue)
# #         }
        
# #         # Calculate averages
# #         num_days = len(daily_revenue)
# #         if num_days > 0:
# #             averages = {
# #                 "avg_daily_orders": totals["total_orders"] / num_days,
# #                 "avg_order_value": totals["order_revenue"] / totals["total_orders"] if totals["total_orders"] > 0 else 0,
# #                 "avg_delivery_fee": totals["delivery_fees"] / totals["total_orders"] if totals["total_orders"] > 0 else 0,
# #                 "avg_app_fee": totals["app_fees"] / totals["total_orders"] if totals["total_orders"] > 0 else 0
# #             }
# #         else:
# #             averages = {}
        
# #         await websocket.send_json({
# #             "type": "pricing_analytics",
# #             "period": period,
# #             "daily_revenue": daily_revenue,
# #             "totals": totals,
# #             "averages": averages
# #         })
        
# #     except Exception as e:
# #         logger.error(f"Error getting pricing analytics: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": "Failed to fetch analytics"
# #         })
# # # def is_valid_status_transition(from_status: str, to_status: str) -> bool:
# # #     """Validate if status transition is allowed"""
# # #     valid_transitions = {
# # #         "pending": ["confirmed", "cancelled"],
# # #         "confirmed": ["preparing", "cancelled"],
# # #         "preparing": ["prepared", "cancelled"],
# # #         "prepared": ["out_for_delivery", "cancelled"],
# # #         "out_for_delivery": ["delivered", "cancelled"],
# # #         "delivered": ["refunded"],
# # #         "cancelled": ["refunded"],
# # #         "refunded": []
# # #     }
    
# # #     return to_status in valid_transitions.get(from_status, [])

# # async def send_analytics_data(websocket: WebSocket, period: str, db):
# #     """Send analytics data for the specified period"""
# #     try:
# #         # Calculate date range based on period
# #         end_date = datetime.utcnow()
# #         if period == "day":
# #             start_date = end_date - timedelta(days=1)
# #         elif period == "week":
# #             start_date = end_date - timedelta(days=7)
# #         elif period == "month":
# #             start_date = end_date - timedelta(days=30)
# #         else:
# #             start_date = end_date - timedelta(days=7)  # Default to week
        
# #         # Get analytics data
# #         analytics = {
# #             "period": period,
# #             "start_date": start_date.isoformat(),
# #             "end_date": end_date.isoformat(),
# #             "orders": {
# #                 "total": await db.count_documents("orders", {
# #                     "created_at": {"$gte": start_date, "$lte": end_date}
# #                 }),
# #                 "by_status": await get_orders_by_status(db, start_date, end_date)
# #             },
# #             "revenue": await calculate_revenue(db, start_date, end_date),
# #             "top_products": await get_top_products(db, start_date, end_date),
# #             "customer_stats": await get_customer_stats(db, start_date, end_date)
# #         }
        
# #         await websocket.send_json({
# #             "type": "analytics_data",
# #             "analytics": analytics
# #         })
        
# #     except Exception as e:
# #         logger.error(f"Error sending analytics: {e}")
# #         await websocket.send_json({
# #             "type": "error",
# #             "message": "Failed to fetch analytics"
# #         })



# # # Helper functions for analytics
# # async def get_orders_by_status(db, start_date, end_date):
# #     """Get order count by status"""
# #     pipeline = [
# #         {
# #             "$match": {
# #                 "created_at": {"$gte": start_date, "$lte": end_date}
# #             }
# #         },
# #         {
# #             "$group": {
# #                 "_id": "$status",
# #                 "count": {"$sum": 1}
# #             }
# #         }
# #     ]
    
# #     result = await db.aggregate("orders", pipeline)
# #     return {item["_id"]: item["count"] for item in result}


# # async def calculate_revenue(db, start_date, end_date):
# #     """Calculate total revenue for the period"""
# #     pipeline = [
# #         {
# #             "$match": {
# #                 "created_at": {"$gte": start_date, "$lte": end_date},
# #                 "status": {"$in": ["completed", "delivered"]}
# #             }
# #         },
# #         {
# #             "$group": {
# #                 "_id": None,
# #                 "total": {"$sum": "$total_amount"}
# #             }
# #         }
# #     ]
    
# #     result = await db.aggregate("orders", pipeline)
# #     return result[0]["total"] if result else 0


# Add these functions to your settings.py file

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