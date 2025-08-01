from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import os
from dotenv import load_dotenv
import logging

from utils.database import DatabaseManager, get_database

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# API Keys
OLA_MAPS_API_KEY = os.getenv('OLA_KRUTRIM_API_KEY', 'dzfpTC3yjmbi4eQLsDzBwBdGyYYdZXN80BFR73kQ')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Base URLs
OLA_MAPS_BASE_URL = 'https://api.olamaps.io/places/v1'
GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api'

# Request/Response Models
class GeocodeRequest(BaseModel):
    address: str

class GeocodeResponse(BaseModel):
    latitude: Optional[float]
    longitude: Optional[float]
    formattedAddress: Optional[str]
    error: Optional[str] = None

class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float

class ReverseGeocodeResponse(BaseModel):
    formattedAddress: str
    addressComponents: Optional[Dict[str, str]] = None
    error: Optional[str] = None

class SearchAddressRequest(BaseModel):
    query: str

# Fixed models for address search
class MatchedSubstring(BaseModel):
    offset: int
    length: int

class StructuredFormatting(BaseModel):
    main_text: str
    main_text_matched_substrings: Optional[List[MatchedSubstring]] = None
    secondary_text: Optional[str] = None
    secondary_text_matched_substrings: Optional[List[MatchedSubstring]] = None

class AddressPrediction(BaseModel):
    place_id: str
    description: str
    structured_formatting: StructuredFormatting

class SearchAddressResponse(BaseModel):
    predictions: List[AddressPrediction]
    error: Optional[str] = None


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_address(request: GeocodeRequest):
    """Convert address to coordinates"""
    try:
        if not request.address:
            raise HTTPException(status_code=400, detail="Address is required")
        
        logger.info(f"Geocoding address: {request.address}")
        
        # Try Ola Maps first
        if OLA_MAPS_API_KEY:
            result = await geocode_with_ola(request.address)
            if result:
                logger.info(f"Ola Maps geocoding successful for: {request.address}")
                return GeocodeResponse(**result)
        
        # Fallback to Google Maps if available
        if GOOGLE_MAPS_API_KEY:
            result = await geocode_with_google(request.address)
            if result:
                logger.info(f"Google Maps geocoding successful for: {request.address}")
                return GeocodeResponse(**result)
        
        # If no geocoding service is available, return null coordinates
        logger.info(f"No geocoding service available for address: {request.address}")
        return GeocodeResponse(
            latitude=None,
            longitude=None,
            formattedAddress=request.address,
            error="Geocoding service not configured"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Geocoding error: {str(e)}")
        return GeocodeResponse(
            latitude=None,
            longitude=None,
            formattedAddress=request.address,
            error=str(e)
        )


@router.post("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode(request: ReverseGeocodeRequest):
    """Convert coordinates to address"""
    try:
        logger.info(f"Reverse geocoding coordinates: {request.latitude}, {request.longitude}")
        
        # Try Ola Maps first
        if OLA_MAPS_API_KEY:
            result = await reverse_geocode_with_ola(request.latitude, request.longitude)
            if result:
                logger.info(f"Ola Maps reverse geocoding successful")
                return ReverseGeocodeResponse(**result)
        
        # Fallback to Google Maps if available
        if GOOGLE_MAPS_API_KEY:
            result = await reverse_geocode_with_google(request.latitude, request.longitude)
            if result:
                logger.info(f"Google Maps reverse geocoding successful")
                return ReverseGeocodeResponse(**result)
        
        # If no service available, return basic address
        logger.info(f"No reverse geocoding service available, returning coordinate-based address")
        return ReverseGeocodeResponse(
            formattedAddress=f'Location at {request.latitude:.6f}, {request.longitude:.6f}',
            addressComponents={
                'street': '',
                'city': '',
                'state': '',
                'pincode': '',
                'country': 'India'
            }
        )
        
    except Exception as e:
        logger.error(f"Reverse geocoding error: {str(e)}")
        # Return a valid response instead of raising exception
        return ReverseGeocodeResponse(
            formattedAddress=f'Location at {request.latitude:.6f}, {request.longitude:.6f}',
            addressComponents={
                'street': '',
                'city': '',
                'state': '',
                'pincode': '',
                'country': 'India'
            },
            error=str(e)
        )


@router.post("/search-address", response_model=SearchAddressResponse)
async def search_address(request: SearchAddressRequest):
    """Search for address suggestions"""
    try:
        if not request.query:
            return SearchAddressResponse(predictions=[])
        
        logger.info(f"Searching addresses for query: {request.query}")
        
        # Try Ola Maps autocomplete
        if OLA_MAPS_API_KEY:
            predictions = await search_with_ola(request.query)
            if predictions:
                logger.info(f"Ola Maps search returned {len(predictions)} results")
                return SearchAddressResponse(predictions=predictions)
        
        # Fallback to Google Places if available
        if GOOGLE_MAPS_API_KEY:
            predictions = await search_with_google(request.query)
            if predictions:
                logger.info(f"Google Maps search returned {len(predictions)} results")
                return SearchAddressResponse(predictions=predictions)
        
        # Return manual entry option if no service available
        logger.info(f"No search service available, returning manual entry option")
        return SearchAddressResponse(predictions=[
            AddressPrediction(
                place_id='manual',
                description=request.query,
                structured_formatting=StructuredFormatting(
                    main_text=request.query,
                    secondary_text='Enter manually'
                )
            )
        ])
        
    except Exception as e:
        logger.error(f"Address search error: {str(e)}")
        return SearchAddressResponse(predictions=[], error=str(e))


# Ola Maps implementation
async def geocode_with_ola(address: str) -> Optional[Dict[str, Any]]:
    """Geocode using Ola Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            # Ola Maps geocoding endpoint
            url = f"{OLA_MAPS_BASE_URL}/geocode"
            params = {
                'address': address,
                'api_key': OLA_MAPS_API_KEY,
                'language': 'en'
            }
            headers = {
                'X-Request-Id': 'backend-geocode'
            }
            
            logger.debug(f"Calling Ola Maps geocode API: {url}")
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok' and data.get('geocodingResults'):
                    result = data['geocodingResults'][0]
                    location = result.get('geometry', {}).get('location', {})
                    return {
                        'latitude': location.get('lat'),
                        'longitude': location.get('lng'),
                        'formattedAddress': result.get('formatted_address', address)
                    }
            else:
                logger.warning(f"Ola Maps geocoding failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Ola Maps geocoding error: {e}")
    
    return None


async def reverse_geocode_with_ola(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """Reverse geocode using Ola Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            # Ola Maps reverse geocoding endpoint
            url = f"{OLA_MAPS_BASE_URL}/reverse-geocode"
            params = {
                'latlng': f'{lat},{lng}',
                'api_key': OLA_MAPS_API_KEY,
                'language': 'en'
            }
            headers = {
                'X-Request-Id': 'backend-reverse-geocode'
            }
            
            logger.debug(f"Calling Ola Maps reverse geocode API: {url}")
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok' and data.get('reverseGeocodingResults'):
                    result = data['reverseGeocodingResults'][0]
                    components = parse_ola_address_components(result)
                    return {
                        'formattedAddress': result.get('formatted_address', ''),
                        'addressComponents': components
                    }
            else:
                logger.warning(f"Ola Maps reverse geocoding failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Ola Maps reverse geocoding error: {e}")
    
    return None


async def search_with_ola(query: str) -> List[AddressPrediction]:
    """Search addresses using Ola Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            # Ola Maps autocomplete endpoint
            url = f"{OLA_MAPS_BASE_URL}/autocomplete"
            params = {
                'input': query,
                'api_key': OLA_MAPS_API_KEY,
                'language': 'en'
            }
            headers = {
                'X-Request-Id': 'backend-search'
            }
            
            logger.debug(f"Calling Ola Maps autocomplete API: {url}")
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                predictions = []
                for pred in data.get('predictions', []):
                    structured = pred.get('structured_formatting', {})
                    predictions.append(AddressPrediction(
                        place_id=pred.get('place_id', ''),
                        description=pred.get('description', ''),
                        structured_formatting=StructuredFormatting(
                            main_text=structured.get('main_text', pred.get('description', '').split(',')[0]),
                            secondary_text=structured.get('secondary_text', ', '.join(pred.get('description', '').split(',')[1:]))
                        )
                    ))
                return predictions
            else:
                logger.warning(f"Ola Maps search failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Ola Maps search error: {e}")
    
    return []


# Google Maps implementation (fallback)
async def geocode_with_google(address: str) -> Optional[Dict[str, Any]]:
    """Geocode using Google Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"{GOOGLE_MAPS_BASE_URL}/geocode/json"
            params = {
                'address': address,
                'key': GOOGLE_MAPS_API_KEY,
                'region': 'in'  # Bias results to India
            }
            
            logger.debug(f"Calling Google Maps geocode API: {url}")
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('results'):
                    result = data['results'][0]
                    location = result.get('geometry', {}).get('location', {})
                    return {
                        'latitude': location.get('lat'),
                        'longitude': location.get('lng'),
                        'formattedAddress': result.get('formatted_address', address)
                    }
            else:
                logger.warning(f"Google Maps geocoding failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Google Maps geocoding error: {e}")
    
    return None


async def reverse_geocode_with_google(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """Reverse geocode using Google Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"{GOOGLE_MAPS_BASE_URL}/geocode/json"
            params = {
                'latlng': f'{lat},{lng}',
                'key': GOOGLE_MAPS_API_KEY
            }
            
            logger.debug(f"Calling Google Maps reverse geocode API: {url}")
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('results'):
                    result = data['results'][0]
                    components = parse_google_address_components(result.get('address_components', []))
                    return {
                        'formattedAddress': result.get('formatted_address', ''),
                        'addressComponents': components
                    }
            else:
                logger.warning(f"Google Maps reverse geocoding failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Google Maps reverse geocoding error: {e}")
    
    return None


async def search_with_google(query: str) -> List[AddressPrediction]:
    """Search addresses using Google Places API"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"{GOOGLE_MAPS_BASE_URL}/place/autocomplete/json"
            params = {
                'input': query,
                'key': GOOGLE_MAPS_API_KEY,
                'components': 'country:in',  # Restrict to India
                'types': 'geocode'
            }
            
            logger.debug(f"Calling Google Places autocomplete API: {url}")
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                predictions = []
                for pred in data.get('predictions', []):
                    structured = pred.get('structured_formatting', {})
                    # Convert the matched_substrings to proper format
                    matched_substrings = []
                    if 'main_text_matched_substrings' in structured:
                        for substr in structured['main_text_matched_substrings']:
                            matched_substrings.append(MatchedSubstring(
                                offset=substr['offset'],
                                length=substr['length']
                            ))
                    
                    secondary_matched_substrings = []
                    if 'secondary_text_matched_substrings' in structured:
                        for substr in structured['secondary_text_matched_substrings']:
                            secondary_matched_substrings.append(MatchedSubstring(
                                offset=substr['offset'],
                                length=substr['length']
                            ))
                    
                    predictions.append(AddressPrediction(
                        place_id=pred.get('place_id', ''),
                        description=pred.get('description', ''),
                        structured_formatting=StructuredFormatting(
                            main_text=structured.get('main_text', ''),
                            main_text_matched_substrings=matched_substrings if matched_substrings else None,
                            secondary_text=structured.get('secondary_text', ''),
                            secondary_text_matched_substrings=secondary_matched_substrings if secondary_matched_substrings else None
                        )
                    ))
                return predictions
            else:
                logger.warning(f"Google Places search failed with status: {response.status_code}")
    except Exception as e:
        logger.error(f"Google Places search error: {e}")
    
    return []


def parse_ola_address_components(result: Dict) -> Dict[str, str]:
    """Parse address components from Ola Maps response"""
    components = {
        'street': '',
        'city': '',
        'state': '',
        'pincode': '',
        'country': 'India'
    }
    
    # Ola Maps specific parsing
    if 'address_components' in result:
        for component in result['address_components']:
            types = component.get('types', [])
            name = component.get('long_name', '')
            
            if 'route' in types:
                components['street'] = name
            elif 'locality' in types:
                components['city'] = name
            elif 'administrative_area_level_1' in types:
                components['state'] = name
            elif 'postal_code' in types:
                components['pincode'] = name
    
    return components


def parse_google_address_components(address_components: List[Dict]) -> Dict[str, str]:
    """Parse address components from Google Maps response"""
    components = {
        'street': '',
        'city': '',
        'state': '',
        'pincode': '',
        'country': ''
    }
    
    for component in address_components:
        types = component.get('types', [])
        name = component.get('long_name', '')
        
        if 'route' in types or 'street_address' in types:
            components['street'] = name
        elif 'locality' in types:
            components['city'] = name
        elif 'administrative_area_level_1' in types:
            components['state'] = name
        elif 'postal_code' in types:
            components['pincode'] = name
        elif 'country' in types:
            components['country'] = name
    
    return components