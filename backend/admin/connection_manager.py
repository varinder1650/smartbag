# # from datetime import datetime
# # from typing import Dict, List, Set
# # from fastapi import WebSocket
# # import logging
# # import asyncio

# # logger = logging.getLogger(__name__)

# # class ConnectionManager:
# #     def __init__(self):
# #         self.active_connections: Dict[str, Set[WebSocket]] = {
# #             "admin": set()
# #         }
# #         self.connection_info: Dict[WebSocket,dict] = {}

# #         self. email_to_websockets: Dict[str, Set[WebSocket]] = {}

# #     async def connect(self, websocket: WebSocket, user_info:dict):
# #         role = user_info.get("role")
# #         email = user_info.get("email")

# #         self.active_connections[role].add(websocket)

# #         self.connection_info[websocket] = {
# #             **user_info,
# #             "connection_at": datetime.utcnow().isoformat()
# #         }

# #         if email:
# #             if email not in self.email_to_websockets:
# #                 self.email_to_websockets[email] = set()
# #             self.email_to_websockets[email].add(websocket)
        
# #         logger.info(f"User {email} connected (role: {role})")

# #         if role == "admin":
# #             await self.notify_admin_status(f"{user_info.get('name', email)} joined", "connected")
    
# #     def disconnect(self, websocket:WebSocket):
# #         info = self.connection_info.get(websocket)

# #         if not info:
# #             return
# #         role = info.get("role")
# #         email = info.get("email")

# #         self.active_connections[role].discard(websocket)

# #         if email and email in self.email_to_websockets:
# #             self.email_to_websockets[email].discard(websocket)
# #             if not self.email_to_websockets[email]:
# #                 del self.email_to_websockets[email]
        
# #         # Remove connection info
# #         del self.connection_info[websocket]
        
# #         logger.info(f"User {email} disconnected")
        
# #         # Notify other admins about admin disconnection
# #         if role == "admin":
# #             asyncio.create_task(
# #                 self.notify_admin_status(f"{info.get('name', email)} left", "disconnected")
# #             )
    
# #     async def send_personal_message(self, websocket: WebSocket, message: dict):
# #         """
# #         Send a message to a specific WebSocket connection
        
# #         Args:
# #             websocket: Target WebSocket connection
# #             message: Message dictionary to send
# #         """
# #         try:
# #             await websocket.send_json(message)
# #         except Exception as e:
# #             logger.error(f"Error sending message: {e}")
# #             self.disconnect(websocket)
    
# #     async def send_to_user(self, email: str, message: dict):
# #         """
# #         Send a message to all connections of a specific user
        
# #         Args:
# #             email: User's email
# #             message: Message to send
# #         """
# #         websockets = self.email_to_websockets.get(email, set())
# #         for ws in list(websockets):  # Create copy to avoid modification during iteration
# #             await self.send_personal_message(ws, message)
    
# #     async def broadcast_to_admins(self, message: dict):
# #         """
# #         Broadcast a message to all connected admin users
        
# #         Args:
# #             message: Message to broadcast
# #         """
# #         admin_websockets = list(self.active_connections["admin"])
# #         for websocket in admin_websockets:
# #             await self.send_personal_message(websocket, message)
        
# #         logger.info(f"Broadcasted to {len(admin_websockets)} admins")
    
# #     async def broadcast_to_role(self, role: str, message: dict):
# #         """
# #         Broadcast a message to all connections with a specific role
        
# #         Args:
# #             role: Role to broadcast to (admin, user, partner)
# #             message: Message to broadcast
# #         """
# #         connections = list(self.active_connections.get(role, set()))
# #         for websocket in connections:
# #             await self.send_personal_message(websocket, message)
    
# #     async def broadcast_to_all(self, message: dict):
# #         """
# #         Broadcast a message to all connected clients
        
# #         Args:
# #             message: Message to broadcast
# #         """
# #         all_connections = []
# #         for connections in self.active_connections.values():
# #             all_connections.extend(connections)
        
# #         for websocket in all_connections:
# #             await self.send_personal_message(websocket, message)
    
# #     async def notify_admin_status(self, message: str, status: str):
# #         """
# #         Notify all admins about admin connection status changes
        
# #         Args:
# #             message: Status message
# #             status: Status type (connected/disconnected)
# #         """
# #         await self.broadcast_to_admins({
# #             "type": "admin_status",
# #             "status": status,
# #             "message": message,
# #             "timestamp": datetime.utcnow().isoformat(),
# #             "active_admins": self.get_active_admin_count()
# #         })
    
# #     def get_active_connections(self) -> Dict[str, List[dict]]:
# #         """
# #         Get information about all active connections
        
# #         Returns:
# #             Dictionary with role as key and list of connection info as value
# #         """
# #         result = {}
# #         for role, websockets in self.active_connections.items():
# #             result[role] = []
# #             for ws in websockets:
# #                 info = self.connection_info.get(ws)
# #                 if info:
# #                     result[role].append({
# #                         "email": info.get("email"),
# #                         "name": info.get("name"),
# #                         "connected_at": info.get("connected_at")
# #                     })
# #         return result
    
# #     def get_active_admin_count(self) -> int:
# #         """Get count of active admin connections"""
# #         return len(self.active_connections["admin"])
    
# #     def get_connection_stats(self) -> dict:
# #         """
# #         Get statistics about current connections
        
# #         Returns:
# #             Dictionary with connection statistics
# #         """
# #         return {
# #             "total_connections": sum(len(conns) for conns in self.active_connections.values()),
# #             "by_role": {
# #                 role: len(conns) for role, conns in self.active_connections.items()
# #             },
# #             "unique_users": len(self.email_to_websockets),
# #             "timestamp": datetime.utcnow().isoformat()
# #         }
    
# #     def is_user_connected(self, email: str) -> bool:
# #         """Check if a user is currently connected"""
# #         return email in self.email_to_websockets
    
# #     async def send_notification(self, email: str, notification: dict):
# #         """
# #         Send a notification to a specific user
        
# #         Args:
# #             email: User's email
# #             notification: Notification data
# #         """
# #         message = {
# #             "type": "notification",
# #             "data": notification,
# #             "timestamp": datetime.utcnow().isoformat()
# #         }
# #         await self.send_to_user(email, message)

# # # Create a global instance
# # manager = ConnectionManager()

# # # Export both the class and instance
# # __all__ = ['ConnectionManager', 'manager']

# # admin/connection_manager.py
# from typing import Dict, Set
# from fastapi import WebSocket
# import asyncio
# import logging

# logger = logging.getLogger(__name__)

# class AdminConnectionManager:
#     def __init__(self):
#         # Only admin connections
#         self.active_connections: Set[WebSocket] = set()
#         self.connection_info: Dict[WebSocket, dict] = {}
#         self.subscriptions: Dict[str, Set[WebSocket]] = {}
        
#         # Track what each admin is viewing
#         self.admin_views: Dict[WebSocket, Set[str]] = {}
    
#     async def connect(self, websocket: WebSocket, admin_info: dict):
#         self.active_connections.add(websocket)
#         self.connection_info[websocket] = admin_info
#         self.admin_views[websocket] = set()
        
#         # Notify other admins
#         await self.broadcast_admin_status({
#             "type": "admin_connected",
#             "admin": admin_info.get("name", admin_info.get("email")),
#             "total_admins": len(self.active_connections)
#         })
        
#         logger.info(f"Admin {admin_info.get('email')} connected")
    
#     async def subscribe(self, websocket: WebSocket, channel: str):
#         """Subscribe admin to specific data channel"""
#         if channel not in self.subscriptions:
#             self.subscriptions[channel] = set()
        
#         self.subscriptions[channel].add(websocket)
#         self.admin_views[websocket].add(channel)
        
#         logger.info(f"Admin subscribed to {channel}")
    
#     async def broadcast_to_channel(self, channel: str, data: dict):
#         """Send data to all admins subscribed to a channel"""
#         if channel in self.subscriptions:
#             disconnected = []
            
#             for ws in self.subscriptions[channel]:
#                 try:
#                     await ws.send_json(data)
#                 except:
#                     disconnected.append(ws)
            
#             # Clean up disconnected
#             for ws in disconnected:
#                 self.disconnect(ws)
    
#     def get_admin_stats(self):
#         """Get current admin activity stats"""
#         return {
#             "total_admins": len(self.active_connections),
#             "admins": [
#                 {
#                     "email": info.get("email"),
#                     "name": info.get("name"),
#                     "viewing": list(self.admin_views.get(ws, set()))
#                 }
#                 for ws, info in self.connection_info.items()
#             ]
#         }

# manager = AdminConnectionManager()

# admin/connection_manager.py
from datetime import datetime
from typing import Dict, List, Set
from fastapi import WebSocket
import logging
import asyncio

logger = logging.getLogger(__name__)

class AdminConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_info: Dict[WebSocket, dict] = {}
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        self.admin_views: Dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, admin_info: dict):
        self.active_connections.add(websocket)
        self.connection_info[websocket] = {
            **admin_info,
            "connected_at": datetime.utcnow().isoformat()
        }
        self.admin_views[websocket] = set()
        
        # Notify other admins
        await self.broadcast_admin_status({
            "type": "admin_connected",
            "admin": admin_info.get("name", admin_info.get("email")),
            "total_admins": len(self.active_connections)
        })
        
        logger.info(f"Admin {admin_info.get('email')} connected")
    
    def disconnect(self, websocket: WebSocket):
        info = self.connection_info.get(websocket)
        if not info:
            return
        
        # Remove from all subscriptions
        for channel, connections in self.subscriptions.items():
            connections.discard(websocket)
        
        # Remove connection info
        self.active_connections.discard(websocket)
        self.connection_info.pop(websocket, None)
        self.admin_views.pop(websocket, None)
        
        logger.info(f"Admin {info.get('email')} disconnected")
        
        # Notify other admins
        asyncio.create_task(
            self.broadcast_admin_status({
                "type": "admin_disconnected",
                "admin": info.get("name", info.get("email")),
                "total_admins": len(self.active_connections)
            })
        )
    
    async def subscribe(self, websocket: WebSocket, channel: str):
        """Subscribe admin to specific data channel"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        
        self.subscriptions[channel].add(websocket)
        if websocket in self.admin_views:
            self.admin_views[websocket].add(channel)
        
        logger.info(f"Admin subscribed to {channel}")
    
    async def unsubscribe(self, websocket: WebSocket, channel: str):
        """Unsubscribe from a channel"""
        if channel in self.subscriptions:
            self.subscriptions[channel].discard(websocket)
        
        if websocket in self.admin_views:
            self.admin_views[websocket].discard(channel)
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_channel(self, channel: str, message: dict):
        """Send data to all admins subscribed to a channel"""
        if channel in self.subscriptions:
            disconnected = []
            
            for ws in self.subscriptions[channel]:
                try:
                    await ws.send_json(message)
                except:
                    disconnected.append(ws)
            
            # Clean up disconnected
            for ws in disconnected:
                self.disconnect(ws)
    
    async def broadcast_admin_status(self, message: dict):
        """Broadcast admin status to all connected admins"""
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(ws)
        
        for ws in disconnected:
            self.disconnect(ws)
    
    def get_admin_stats(self):
        """Get current admin activity stats"""
        return {
            "total_admins": len(self.active_connections),
            "admins": [
                {
                    "email": info.get("email"),
                    "name": info.get("name"),
                    "connected_at": info.get("connected_at"),
                    "viewing": list(self.admin_views.get(ws, set()))
                }
                for ws, info in self.connection_info.items()
            ]
        }

# Global instance
manager = AdminConnectionManager()