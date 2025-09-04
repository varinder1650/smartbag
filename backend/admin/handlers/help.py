from fastapi import WebSocket

from admin.utils.serialize import serialize_document
import logging

logger = logging.getLogger(__name__)

async def get_tickets(websocket: WebSocket, filters:dict,db):
    try:
        tickets = await db.find_many("support_tickets",{},sort=[("created_at",-1)])
        serialized_tickets = [serialize_document(ticket) for ticket in tickets]

        await websocket.send_json({
            "type": "help_tickets_data",
            "tickets": serialized_tickets
        })
    except Exception as e:
        logger.error(f"Error getting the tickets: {e}")
        raise e