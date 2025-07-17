from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import httpx
import os
from typing import Optional

from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/search")
async def search_addresses(
    query: str = Query(..., description="Search query for addresses"),
    db: DatabaseManager = Depends(get_database)
):
    """Search addresses using Google Maps Places Autocomplete API"""
    try:
        if not query:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query parameter is required"
            )

        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Maps API key not configured"
            )

        # Use Places Autocomplete API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                params={
                    "input": query,
                    "key": api_key,
                    "components": "country:in"
                }
            )
            
            data = response.json()
            
            if data.get("status") == "OK":
                return {"predictions": data.get("predictions", [])}
            else:
                return {"predictions": []}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Address search error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching addresses"
        )

@router.post("/geocode")
async def geocode_address(
    address: str,
    db: DatabaseManager = Depends(get_database)
):
    """Geocode address to get coordinates"""
    try:
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Maps API key not configured"
            )

        # Geocode the address
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": api_key
                }
            )
            
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                location = result["geometry"]["location"]
                
                return {
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                    "formattedAddress": result["formatted_address"]
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Address not found"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error geocoding address"
        )

@router.post("/validate")
async def validate_address(
    address: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Validate address using Google Maps Geocoding API"""
    try:
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Maps API key not configured"
            )

        # Geocode the address
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": api_key
                }
            )
            
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                location = result["geometry"]["location"]
                
                # Extract address components
                address_components = result["address_components"]
                
                def find_component(types_list):
                    for component in address_components:
                        if any(t in component["types"] for t in types_list):
                            return component["long_name"]
                    return ""
                
                street_number = find_component(["street_number"])
                route = find_component(["route"])
                locality = find_component(["locality"])
                postal_code = find_component(["postal_code"])
                country = find_component(["country"])
                
                return {
                    "valid": True,
                    "coordinates": {
                        "latitude": location["lat"],
                        "longitude": location["lng"]
                    },
                    "formattedAddress": result["formatted_address"],
                    "addressComponents": {
                        "street": f"{street_number} {route}".strip(),
                        "city": locality,
                        "pincode": postal_code,
                        "country": country
                    }
                }
            else:
                return {
                    "valid": False,
                    "message": "Address not found or invalid"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Address validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating address"
        )

@router.post("/reverse-geocode")
async def reverse_geocode(
    latitude: float,
    longitude: float,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Get address from coordinates (reverse geocoding)"""
    try:
        if not latitude or not longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude and longitude are required"
            )

        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Maps API key not configured"
            )

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "latlng": f"{latitude},{longitude}",
                    "key": api_key
                }
            )
            
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                address_components = result["address_components"]
                
                def find_component(types_list):
                    for component in address_components:
                        if any(t in component["types"] for t in types_list):
                            return component["long_name"]
                    return ""
                
                street_number = find_component(["street_number"])
                route = find_component(["route"])
                locality = find_component(["locality"])
                postal_code = find_component(["postal_code"])
                country = find_component(["country"])
                
                return {
                    "formattedAddress": result["formatted_address"],
                    "addressComponents": {
                        "street": f"{street_number} {route}".strip(),
                        "city": locality,
                        "pincode": postal_code,
                        "country": country
                    }
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Address not found for these coordinates"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting address from coordinates"
        ) 