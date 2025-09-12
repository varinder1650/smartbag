from fastapi import WebSocket

from admin.utils.serialize import serialize_document
import logging

logger = logging.getLogger(__name__)

async def get_requests(websocket: WebSocket, filters:dict,db):
    try:
        requests = await db.find_many("product_requests",{},sort=[("created_at",-1)])
        
        for request in requests:
            # print(request)
            user_id = request["user_id"]
            user_data = await db.find_one("users",{"_id": user_id})
            request['user_name'] = user_data["name"]
            request['email'] = user_data["email"]
            request['phone'] = user_data["phone"]
            # print(request)
        serialized_requests = [serialize_document(request) for request in requests]

        await websocket.send_json({
            "type": "suggestions_data",
            "suggestions": serialized_requests
        })
    except Exception as e:
        logger.error(f"Error getting the requests: {e}")
        raise e