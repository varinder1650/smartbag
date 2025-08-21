import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';
import { withCache } from './cache';
import Constants from 'expo-constants';

// ✅ Reset endpoint status - don't let previous 404s block future attempts
let endpointStatus = {
  searchAddresses: true,
  geocode: true,
  reverseGeocode: true,
};

// ✅ Function to force reset endpoint status
export const resetEndpointStatus = () => {
  endpointStatus = {
    searchAddresses: true,
    geocode: true,
    reverseGeocode: true,
  };
  console.log('🔄 Reset all endpoint status flags to true');
};

// ✅ Call reset on module load
resetEndpointStatus();

// Get Ola Krutrim API key from environment
const OLA_KRUTRIM_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OLA_KRUTRIM_API_KEY || 
                            process.env.EXPO_PUBLIC_OLA_KRUTRIM_API_KEY;

export const geocodeAddress = async (address) => {
  try {
    console.log('🗺️ Starting geocoding for:', address);
    console.log('🔧 Geocoding endpoint status:', endpointStatus.geocode);
    console.log('🔗 Using endpoint:', API_ENDPOINTS.GEOCODE);
    
    // ✅ Always try the API call, ignore previous status
    try {
      console.log('📡 Making geocoding API call...');
      
      const response = await api.post('/geocode', { address }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('✅ Geocoding API response status:', response.status);
      console.log('📋 Geocoding response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data) {
        const data = response.data;
        if (data.latitude && data.longitude) {
          console.log('✅ Got coordinates from API:', data.latitude, data.longitude);
          endpointStatus.geocode = true; // ✅ Mark as working
          return {
            latitude: data.latitude,
            longitude: data.longitude,
            formattedAddress: data.formattedAddress || address,
            source: 'backend_api',
            note: data.note,
          };
        } else if (data.latitude === null && data.longitude === null) {
          console.log('⚠️ API returned null coordinates but endpoint is working');
          endpointStatus.geocode = true; // ✅ Endpoint works, just no coordinates
          return {
            latitude: null,
            longitude: null,
            formattedAddress: data.formattedAddress || address,
            source: 'backend_api',
            note: data.note || 'No coordinates found',
          };
        }
      }
    } catch (backendError) {
      console.error('❌ Backend geocoding error details:', {
        status: backendError.response?.status,
        statusText: backendError.response?.statusText,
        data: backendError.response?.data,
        message: backendError.message
      });
      
      if (backendError.response?.status === 404) {
        endpointStatus.geocode = false;
        console.log('🚫 Geocoding endpoint not found - API not implemented');
      } else if (backendError.response?.status === 401) {
        console.log('🔑 API authentication error');
      } else {
        console.log('🔄 Other backend error, will retry next time');
        // Don't mark as unavailable for temporary errors
      }
    }
    
    // Fallback to local city coordinates
    console.log('🔄 Using fallback city coordinates for:', address);
    const cityCoordinates = {
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'delhi': { latitude: 28.7041, longitude: 77.1025 },
      'bangalore': { latitude: 12.9716, longitude: 77.5946 },
      'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
      'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
      'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
      'chennai': { latitude: 13.0827, longitude: 80.2707 },
      'kolkata': { latitude: 22.5726, longitude: 88.3639 },
      'pune': { latitude: 18.5204, longitude: 73.8567 },
      'jaipur': { latitude: 26.9124, longitude: 75.7873 },
      'lucknow': { latitude: 26.8467, longitude: 80.9462 },
    };
    
    const addressLower = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (addressLower.includes(city)) {
        console.log('✅ Found fallback coordinates for city:', city);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address,
          source: 'fallback',
          note: 'Approximate location based on city name',
        };
      }
    }
    
    console.log('❌ No fallback coordinates found');
    return {
      latitude: null,
      longitude: null,
      formattedAddress: address,
      source: 'none',
      note: 'Could not determine coordinates',
    };
  } catch (error) {
    console.error('❌ All geocoding methods failed:', error);
    return {
      latitude: null,
      longitude: null,
      formattedAddress: address,
      source: 'error',
      note: 'Geocoding service unavailable',
    };
  }
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    console.log('🔄 Starting reverse geocoding for:', latitude, longitude);
    console.log('🔧 Reverse geocoding endpoint status:', endpointStatus.reverseGeocode);
    console.log('🔗 Using endpoint:', API_ENDPOINTS.REVERSE_GEOCODE);

    // ✅ Always try the API call, ignore previous status
    try {
      console.log('📡 Making reverse geocoding API call...');
      
      const response = await api.post('/reverse-geocode', { 
        latitude, 
        longitude 
      }, {
        timeout: 15000,
      });
      
      console.log('✅ Reverse geocoding API response status:', response.status);
      console.log('📋 Reverse geocoding response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.formattedAddress) {
        console.log('✅ Got address from API:', response.data.formattedAddress);
        endpointStatus.reverseGeocode = true; // ✅ Mark as working
        return {
          formattedAddress: response.data.formattedAddress,
          address: response.data.city || '',
          city: response.data.city || '',
          state: response.data.state || '',
          pincode: response.data.pincode || '',
          country: response.data.country || 'India',
          source: 'backend_api',
        };
      }
    } catch (backendError) {
      console.error('❌ Backend reverse geocoding error details:', {
        status: backendError.response?.status,
        statusText: backendError.response?.statusText,
        data: backendError.response?.data,
        message: backendError.message
      });
      
      if (backendError.response?.status === 404) {
        endpointStatus.reverseGeocode = false;
        console.log('🚫 Reverse geocoding endpoint not found');
      } else {
        console.log('🔄 Temporary error, will retry next time');
      }
    }
    
    console.log('❌ Reverse geocoding failed, returning null');
    return null;
  } catch (error) {
    console.error('❌ All reverse geocoding methods failed:', error);
    return null;
  }
};

// ✅ Remove caching for searchAddresses to ensure fresh calls
const searchAddressesFn = async (query) => {
  try {
    console.log('🔍 Starting address search for:', query);
    console.log('🔧 Search endpoint status:', endpointStatus.searchAddresses);
    console.log('🔗 Using endpoint:', API_ENDPOINTS.SEARCH_ADDRESSES);

    // ✅ Always try the API call, ignore previous status
    try {
      console.log('📡 Making address search API call...');
      
      const response = await api.get('/search-addresses', {
        params: { query },
        timeout: 15000,
      });
      
      console.log('✅ Address search API response status:', response.status);
      console.log('📋 Address search response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.predictions && Array.isArray(response.data.predictions)) {
        console.log('✅ Got', response.data.predictions.length, 'predictions from API');
        endpointStatus.searchAddresses = true; // ✅ Mark as working
        
        // Transform the predictions to ensure consistent format
        const predictions = response.data.predictions.map((prediction, index) => ({
          place_id: prediction.place_id || `pred_${index}`,
          description: prediction.description || '',
          structured_formatting: {
            main_text: prediction.structured_formatting?.main_text || prediction.description?.split(',')[0] || '',
            secondary_text: prediction.structured_formatting?.secondary_text || prediction.description?.split(',').slice(1).join(',') || ''
          },
          source: 'backend_api'
        }));
        
        return {
          predictions,
          status: 'OK',
          source: 'backend'
        };
      } else {
        console.log('⚠️ API returned invalid or empty predictions format');
        endpointStatus.searchAddresses = true; // ✅ Endpoint works, just no data
        return {
          predictions: [{
            place_id: 'manual',
            description: query,
            structured_formatting: {
              main_text: query,
              secondary_text: 'No suggestions found - enter manually'
            }
          }],
          status: 'NO_RESULTS'
        };
      }
      
    } catch (backendError) {
      console.error('❌ Backend address search error details:', {
        status: backendError.response?.status,
        statusText: backendError.response?.statusText,
        data: backendError.response?.data,
        message: backendError.message,
        url: backendError.config?.url
      });
      
      if (backendError.response?.status === 404) {
        endpointStatus.searchAddresses = false;
        console.log('🚫 Address search endpoint not found - API not implemented');
        
        return {
          predictions: [{
            place_id: 'manual',
            description: query,
            structured_formatting: {
              main_text: query,
              secondary_text: 'Enter manually'
            }
          }],
          status: 'ENDPOINT_NOT_AVAILABLE'
        };
      } else if (backendError.response?.status === 401) {
        console.log('🔑 API authentication error');
        return {
          predictions: [{
            place_id: 'api_key_issue',
            description: query,
            structured_formatting: {
              main_text: query,
              secondary_text: 'API key configuration needed'
            }
          }],
          status: 'API_KEY_ISSUE'
        };
      } else {
        console.log('🔄 Temporary backend error, will retry next time');
        throw backendError;
      }
    }
  } catch (error) {
    console.error('❌ Address search failed completely:', error);
    
    return {
      predictions: [{
        place_id: 'fallback',
        description: query,
        structured_formatting: {
          main_text: query,
          secondary_text: 'Search failed - enter manually'
        }
      }],
      status: 'ERROR'
    };
  }
};

// ✅ Export without caching for now to ensure fresh calls
export const searchAddresses = searchAddressesFn;

// ✅ Add a debug function to test API connectivity
export const testAddressApi = async () => {
  console.log('🧪 Testing address API connectivity...');
  console.log('📍 API Base URL:', API_ENDPOINTS.SEARCH_ADDRESSES.replace('/search-addresses', ''));
  
  try {
    // Test health endpoint first
    const healthResponse = await api.get('/health');
    console.log('❤️ Health check result:', {
      status: healthResponse.status,
      data: healthResponse.data
    });
    
    // Test search endpoint
    const searchResponse = await api.get('/search-addresses', {
      params: { query: 'test' },
      timeout: 10000,
    });
    console.log('🔍 Search test result:', {
      status: searchResponse.status,
      data: searchResponse.data
    });
    
    return {
      health: healthResponse.status === 200,
      search: searchResponse.status === 200,
      healthData: healthResponse.data,
      searchData: searchResponse.data
    };
  } catch (error) {
    console.error('🚫 API test failed:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    });
    
    return {
      health: false,
      search: false,
      error: error.message
    };
  }
};

// Utility function to check if Ola Maps API is configured
export const isOlaKrutrimConfigured = () => {
  return Boolean(OLA_KRUTRIM_API_KEY);
};

// Utility function to get API status
export const getApiStatus = () => {
  return {
    searchAddresses: endpointStatus.searchAddresses,
    geocode: endpointStatus.geocode,
    reverseGeocode: endpointStatus.reverseGeocode,
    olaKrutrimConfigured: isOlaKrutrimConfigured(),
    endpoints: {
      search: API_ENDPOINTS.SEARCH_ADDRESSES,
      geocode: API_ENDPOINTS.GEOCODE,
      reverseGeocode: API_ENDPOINTS.REVERSE_GEOCODE
    }
  };
};

// Function to validate address using your backend
export const validateAddress = async (address) => {
  try {
    const response = await api.post('/validate', { address }, {
      timeout: 15000,
    });
    
    return response.data;
  } catch (error) {
    console.error('Address validation failed:', error);
    return {
      valid: false,
      message: 'Address validation failed'
    };
  }
};

// Function to save temporary address
export const saveTempAddress = async (addressData) => {
  try {
    const response = await api.post('/save-temp', addressData, {
      timeout: 10000,
    });
    
    return response.data;
  } catch (error) {
    console.error('Save temp address failed:', error);
    throw error;
  }
};