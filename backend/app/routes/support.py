from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
import logging
from typing import List
from datetime import datetime
from app.utils.auth import get_current_user
from db.db_manager import DatabaseManager, get_database
from schema.support import (
    SupportTicketCreate, SupportTicketResponse, SupportTicketStatus,
    ProductRequestCreate, ProductRequestResponse, ProductRequestStatus
)
from app.utils.mongo import fix_mongo_types

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    ticket_data: SupportTicketCreate,
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new support ticket"""
    try:
        ticket_doc = ticket_data.dict()
        ticket_doc["user_id"] = ObjectId(current_user.id)
        ticket_doc["user_name"] = current_user.name
        ticket_doc["user_email"] = current_user.email
        ticket_doc["status"] = SupportTicketStatus.OPEN
        ticket_doc["created_at"] = datetime.utcnow()
        ticket_doc["updated_at"] = datetime.utcnow()
        
        # Convert order_id to ObjectId if provided
        if ticket_doc.get("order_id"):
            if ObjectId.is_valid(ticket_doc["order_id"]):
                ticket_doc["order_id"] = ObjectId(ticket_doc["order_id"])
            else:
                ticket_doc["order_id"] = None
        
        ticket_id = await db.insert_one("support_tickets", ticket_doc)
        
        # Get the created ticket
        created_ticket = await db.find_one("support_tickets", {"_id": ObjectId(ticket_id)})
        fixed_ticket = fix_mongo_types(created_ticket)
        
        logger.info(f"Support ticket created for user {current_user.email}: {ticket_data.subject}")
        
        # TODO: Send notification to admin (email, webhook, etc.)
        # await send_admin_notification("new_support_ticket", fixed_ticket)
        
        return SupportTicketResponse(**fixed_ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create support ticket error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create support ticket"
        )

@router.get("/tickets", response_model=List[SupportTicketResponse])
async def get_user_tickets(
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get all support tickets for the current user"""
    try:
        tickets = await db.find_many(
            "support_tickets",
            {"user_id": ObjectId(current_user.id)},
            sort=[("created_at", -1)]
        )
        
        fixed_tickets = [fix_mongo_types(ticket) for ticket in tickets]
        return [SupportTicketResponse(**ticket) for ticket in fixed_tickets]
        
    except Exception as e:
        logger.error(f"Get user tickets error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get support tickets"
        )

@router.post("/product-requests", response_model=ProductRequestResponse)
async def create_product_request(
    request_data: ProductRequestCreate,
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """Create a new product request"""
    try:
        # Check if user already has a similar product request
        similar_request = await db.find_one("product_requests", {
            "user_id": ObjectId(current_user.id),
            "product_name": {"$regex": request_data.product_name, "$options": "i"},
            "status": {"$in": [ProductRequestStatus.PENDING, ProductRequestStatus.UNDER_REVIEW]}
        })
        
        if similar_request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a pending request for a similar product"
            )
        
        request_doc = request_data.dict()
        request_doc["user_id"] = ObjectId(current_user.id)
        request_doc["user_name"] = current_user.name
        request_doc["user_email"] = current_user.email
        request_doc["status"] = ProductRequestStatus.PENDING
        request_doc["votes"] = 1  # User's own vote
        request_doc["created_at"] = datetime.utcnow()
        request_doc["updated_at"] = datetime.utcnow()
        
        request_id = await db.insert_one("product_requests", request_doc)
        
        # Get the created request
        created_request = await db.find_one("product_requests", {"_id": ObjectId(request_id)})
        fixed_request = fix_mongo_types(created_request)
        
        logger.info(f"Product request created for user {current_user.email}: {request_data.product_name}")
        
        # TODO: Send notification to admin
        # await send_admin_notification("new_product_request", fixed_request)
        
        return ProductRequestResponse(**fixed_request)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create product request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product request"
        )

@router.get("/product-requests", response_model=List[ProductRequestResponse])
async def get_user_product_requests(
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get all product requests for the current user"""
    try:
        requests = await db.find_many(
            "product_requests",
            {"user_id": ObjectId(current_user.id)},
            sort=[("created_at", -1)]
        )
        
        fixed_requests = [fix_mongo_types(request) for request in requests]
        return [ProductRequestResponse(**request) for request in fixed_requests]
        
    except Exception as e:
        logger.error(f"Get user product requests error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product requests"
        )

@router.post("/product-requests/{request_id}/vote")
async def vote_product_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db: DatabaseManager = Depends(get_database)
):
    """Vote for a product request (users can upvote requests they want)"""
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request ID"
            )
        
        # Check if request exists
        request_doc = await db.find_one("product_requests", {"_id": ObjectId(request_id)})
        if not request_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product request not found"
            )
        
        # Check if user already voted
        existing_vote = await db.find_one("product_request_votes", {
            "request_id": ObjectId(request_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if existing_vote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already voted for this request"
            )
        
        # Add vote
        await db.insert_one("product_request_votes", {
            "request_id": ObjectId(request_id),
            "user_id": ObjectId(current_user.id),
            "voted_at": datetime.utcnow()
        })
        
        # Update vote count
        await db.update_one(
            "product_requests",
            {"_id": ObjectId(request_id)},
            {
                "$inc": {"votes": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"User {current_user.email} voted for product request {request_id}")
        return {"message": "Vote added successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vote product request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to vote for product request"
        )

# Admin endpoints (add proper admin authentication)
@router.get("/admin/tickets", response_model=List[SupportTicketResponse])
async def get_all_support_tickets(
    skip: int = 0,
    limit: int = 50,
    db: DatabaseManager = Depends(get_database)
    # current_admin=Depends(get_current_admin)  # Add admin auth
):
    """Get all support tickets for admin"""
    try:
        tickets = await db.find_many(
            "support_tickets",
            {},
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit
        )
        
        fixed_tickets = [fix_mongo_types(ticket) for ticket in tickets]
        return [SupportTicketResponse(**ticket) for ticket in fixed_tickets]
        
    except Exception as e:
        logger.error(f"Get all tickets error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get support tickets"
        )

@router.get("/admin/product-requests", response_model=List[ProductRequestResponse])
async def get_all_product_requests(
    skip: int = 0,
    limit: int = 50,
    db: DatabaseManager = Depends(get_database)
    # current_admin=Depends(get_current_admin)  # Add admin auth
):
    """Get all product requests for admin"""
    try:
        requests = await db.find_many(
            "product_requests",
            {},
            sort=[("votes", -1), ("created_at", -1)],  # Sort by votes first, then date
            skip=skip,
            limit=limit
        )
        
        fixed_requests = [fix_mongo_types(request) for request in requests]
        return [ProductRequestResponse(**request) for request in fixed_requests]
        
    except Exception as e:
        logger.error(f"Get all product requests error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product requests"
        )