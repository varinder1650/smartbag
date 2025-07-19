from fastapi import APIRouter, HTTPException, status, Depends, Query, Form, Body
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import httpx
import os
from typing import Optional
from pydantic import BaseModel

from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB, UserAddress, UserAddressResponse

logger = logging.getLogger(__name__)
router = APIRouter()

class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float

@router.get("/search")
async def search_addresses(
    query: str = Query(..., description="Search query for addresses"),
    db: DatabaseManager = Depends(get_database)
):
    """Search addresses using Ola Maps Places Autocomplete API with fallback"""
    try:
        if not query:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query parameter is required"
            )

        api_key = os.getenv("OLA_KRUTRIM_API_KEY")
        if not api_key:
            logger.warning("Ola Maps API key not configured, using fallback suggestions")
            return _get_fallback_predictions(query)

        # Try Ola Maps API first
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.olamaps.io/places/v1/autocomplete",
                    params={
                        "input": query,
                        "api_key": api_key,
                        "language": "en"
                    },
                    headers={
                        "X-Request-Id": "backend-search"
                    }
                )
                
                data = response.json()
                logger.info(f"Ola Maps search response for '{query}': {data.get('status')}")
                
                if data.get("status") == "ok" and data.get("predictions"):
                    predictions = data.get("predictions", [])
                    
                    # Enhance predictions with additional context
                    enhanced_predictions = []
                    for pred in predictions:
                        enhanced_pred = {
                            "place_id": pred.get("place_id"),
                            "description": pred.get("description"),
                            "structured_formatting": pred.get("structured_formatting", {
                                "main_text": pred.get("description", "").split(",")[0],
                                "secondary_text": ", ".join(pred.get("description", "").split(",")[1:])
                            }),
                            "types": pred.get("types", []),
                            "matched_substrings": pred.get("matched_substrings", [])
                        }
                        enhanced_predictions.append(enhanced_pred)
                    
                    # If we have good results, return them
                    if enhanced_predictions:
                        return {"predictions": enhanced_predictions}
                    
                    # If no results, return fallback
                    return {"predictions": _get_fallback_predictions(query)}
                else:
                    # Handle different status codes
                    logger.warning(f"Ola Maps API returned status: {data.get('status')}")
                    return {"predictions": _get_fallback_predictions(query)}
                    
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning(f"Ola Maps API connection error: {e}")
            return {"predictions": _get_fallback_predictions(query)}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Address search error: {e}")
        # Return fallback suggestions instead of throwing an error
        return {"predictions": _get_fallback_predictions(query)}

def _get_fallback_predictions(query: str):
    """Generate fallback predictions when API is not available"""
    fallback_predictions = []
    
    # Add the original query as a manual option
    fallback_predictions.append({
        "place_id": "manual_original",
        "description": query,
        "structured_formatting": {
            "main_text": query,
            "secondary_text": "Enter manually"
        },
        "types": ["manual"],
        "matched_substrings": []
    })
    
    # Add some common Indian cities if the query looks like a city search
    if len(query) >= 3:
        common_cities = [
            "Mumbai, Maharashtra, India",
            "Delhi, India", 
            "Bangalore, Karnataka, India",
            "Chennai, Tamil Nadu, India",
            "Kolkata, West Bengal, India",
            "Hyderabad, Telangana, India",
            "Pune, Maharashtra, India",
            "Ahmedabad, Gujarat, India",
            "Jaipur, Rajasthan, India",
            "Lucknow, Uttar Pradesh, India"
        ]
        
        for city in common_cities:
            if query.lower() in city.lower():
                fallback_predictions.append({
                    "place_id": f"city_{city.replace(' ', '_').replace(',', '')}",
                    "description": city,
                    "structured_formatting": {
                        "main_text": city.split(",")[0],
                        "secondary_text": ", ".join(city.split(",")[1:])
                    },
                    "types": ["locality"],
                    "matched_substrings": []
                })
    
    return fallback_predictions

@router.post("/geocode")
async def geocode_address(
    address: str = Form(...),
    db: DatabaseManager = Depends(get_database)
):
    """Geocode address to get coordinates using Ola Maps API with fallback"""
    try:
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        api_key = os.getenv("OLA_KRUTRIM_API_KEY")
        if not api_key:
            logger.warning("Ola Maps API key not configured, using default coordinates")
            return _get_default_coordinates(address)

        # Try Ola Maps API first
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.olamaps.io/places/v1/geocode",
                    params={
                        "address": address,
                        "api_key": api_key,
                        "language": "en"
                    },
                    headers={
                        "X-Request-Id": "backend-geocode"
                    }
                )
                
                data = response.json()
                logger.info(f"Ola Maps geocoding response for '{address}': {data.get('status')}")
                
                if data.get("status") == "ok" and data.get("geocodingResults"):
                    result = data["geocodingResults"][0]
                    location = result["geometry"]["location"]
                    
                    return {
                        "latitude": location["lat"],
                        "longitude": location["lng"],
                        "formattedAddress": result["formatted_address"]
                    }
                elif data.get("status") == "zero_results":
                    # If no exact match found, try with a more general search
                    logger.info(f"No exact match found for '{address}', trying general search")
                    
                    # Try with just the city/state part
                    address_parts = address.split(',')
                    if len(address_parts) >= 2:
                        general_address = ','.join(address_parts[-2:]).strip()  # Take last 2 parts (city, state)
                        
                        response2 = await client.get(
                            "https://api.olamaps.io/places/v1/geocode",
                            params={
                                "address": general_address,
                                "api_key": api_key,
                                "language": "en"
                            },
                            headers={
                                "X-Request-Id": "backend-geocode-general"
                            }
                        )
                        
                        data2 = response2.json()
                        logger.info(f"General search response for '{general_address}': {data2.get('status')}")
                        
                        if data2.get("status") == "ok" and data2.get("geocodingResults"):
                            result = data2["geocodingResults"][0]
                            location = result["geometry"]["location"]
                            
                            return {
                                "latitude": location["lat"],
                                "longitude": location["lng"],
                                "formattedAddress": result["formatted_address"],
                                "note": "Approximate location based on city/state"
                            }
                    
                    # If still no results, return default coordinates
                    logger.warning(f"Could not geocode '{address}', using default coordinates")
                    return _get_default_coordinates(address, "Address not found")
                else:
                    # For other status codes, return default coordinates
                    logger.warning(f"Geocoding failed for '{address}' with status: {data.get('status')}")
                    return _get_default_coordinates(address, "Geocoding failed")
                    
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning(f"Ola Maps API connection error: {e}")
            return _get_default_coordinates(address, "API connection error")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        # Return default coordinates instead of throwing an error
        return _get_default_coordinates(address, "Error occurred")

def _get_default_coordinates(address: str, note: str = "Default coordinates"):
    """Return default coordinates for India center"""
    return {
        "latitude": 20.5937,
        "longitude": 78.9629,
        "formattedAddress": address,
        "note": f"{note} - using default coordinates (India center)"
    }

@router.post("/save-temp")
async def save_temp_address(
    address_data: UserAddress,
    db: DatabaseManager = Depends(get_database)
):
    """Save temporary address without authentication (for checkout flow)"""
    try:
        if not address_data.address or not address_data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        # For temporary addresses, we just return the address data
        # In a real implementation, you might want to store this in a session or temporary storage
        return {
            "address": address_data.address.strip(),
            "location": {
                "latitude": address_data.latitude,
                "longitude": address_data.longitude
            } if address_data.latitude and address_data.longitude else None,
            "message": "Address saved temporarily"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save temp address error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error saving temporary address"
        )

@router.post("/validate")
async def validate_address(
    address: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Validate address using Ola Krutrim Maps Geocoding API with fallback"""
    try:
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is required"
            )

        api_key = os.getenv("OLA_KRUTRIM_API_KEY")
        if not api_key:
            logger.warning("Ola Krutrim API key not configured")
            return {
                "valid": False,
                "message": "Address validation service not available"
            }

        # Try Ola Krutrim API first
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.krutrim.ai/v1/maps/geocode",
                    params={
                        "address": address,
                        "key": api_key
                    }
                )
                
                data = response.json()
                logger.info(f"Ola Krutrim validation response for '{address}': {data.get('status')}")
                
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
                    
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning(f"Ola Krutrim API connection error: {e}")
            return {
                "valid": False,
                "message": "Address validation service temporarily unavailable"
            }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Address validation error: {e}")
        return {
            "valid": False,
            "message": "Error validating address"
        }

@router.post("/reverse-geocode")
async def reverse_geocode(
    request: ReverseGeocodeRequest,
    db: DatabaseManager = Depends(get_database)
):
    """Get address from coordinates (reverse geocoding) using Ola Maps API with fallback"""
    try:
        latitude = request.latitude
        longitude = request.longitude
        
        if not latitude or not longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude and longitude are required"
            )

        api_key = os.getenv("OLA_KRUTRIM_API_KEY")
        if not api_key:
            logger.warning("Ola Maps API key not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Reverse geocoding service not available"
            )

        # Try Ola Maps API first
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.olamaps.io/places/v1/reverse-geocode",
                    params={
                        "latlng": f"{latitude},{longitude}",
                        "api_key": api_key,
                        "language": "en"
                    },
                    headers={
                        "X-Request-Id": "backend-reverse-geocode"
                    }
                )
                
                data = response.json()
                logger.info(f"Ola Maps reverse geocoding response for {latitude},{longitude}: {data.get('status')}")
                
                if data.get("status") == "ok" and data.get("reverseGeocodingResults"):
                    result = data["reverseGeocodingResults"][0]
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
                    
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning(f"Ola Maps API connection error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Reverse geocoding service temporarily unavailable"
            )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting address from coordinates"
        ) 