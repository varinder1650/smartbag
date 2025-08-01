import api from './client';
import { withCache } from './cache';

const endpointStatus = {
  searchAddresses: true,
  geocode: true,
  reverseGeocode: true,
};

export const geocodeAddress = async (address) => {
  try {
    if (!endpointStatus.geocode) {
      return {
        latitude: null,
        longitude: null,
        formattedAddress: address,
        note: 'Geocoding API not available',
      };
    }

    try {
      const response = await api.post('/geocode', { address }, {
        timeout: 8000,
      });
      
      if (response.data && response.data.latitude && response.data.longitude) {
        return {
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          formattedAddress: response.data.formattedAddress || address,
        };
      }
    } catch (backendError) {
      if (backendError.response?.status === 404) {
        endpointStatus.geocode = false;
        console.log('📍 Geocoding API not implemented - using manual map positioning');
      } else {
        console.error('Backend geocoding failed:', backendError);
      }
    }
    
    const cityCoordinates = {
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'delhi': { latitude: 28.7041, longitude: 77.1025 },
      'bangalore': { latitude: 12.9716, longitude: 77.5946 },
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
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address,
          note: 'Approximate location based on city name',
        };
      }
    }
    
    return {
      latitude: null,
      longitude: null,
      formattedAddress: address,
      note: 'Could not determine coordinates',
    };
  } catch (error) {
    console.error('All geocoding methods failed:', error);
    return {
      latitude: null,
      longitude: null,
      formattedAddress: address,
      note: 'Geocoding service unavailable',
    };
  }
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!endpointStatus.reverseGeocode) {
      return null;
    }

    try {
      const response = await api.post('/reverse-geocode', { 
        latitude, 
        longitude 
      }, {
        timeout: 8000,
      });
      
      if (response.data && response.data.formattedAddress) {
        return {
          formattedAddress: response.data.formattedAddress,
          address: response.data.address,
          city: response.data.city,
          state: response.data.state,
          pincode: response.data.pincode,
          country: response.data.country,
        };
      }
    } catch (backendError) {
      if (backendError.response?.status === 404) {
        endpointStatus.reverseGeocode = false;
        console.log('📍 Reverse geocoding API not implemented - using device location services');
      } else {
        console.error('Backend reverse geocoding failed:', backendError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('All reverse geocoding methods failed:', error);
    return null;
  }
};

const searchAddressesFn = async (query) => {
  try {
    if (!endpointStatus.searchAddresses) {
      return {
        predictions: [],
        status: 'ENDPOINT_NOT_AVAILABLE'
      };
    }

    try {
      const response = await api.get('/search-addresses', {
        params: { query },
        timeout: 8000,
      });
      
      return response.data;
    } catch (backendError) {
      if (backendError.response?.status === 404) {
        endpointStatus.searchAddresses = false;
        console.log('📍 Address search API not implemented - using manual entry only');
        
        return {
          predictions: [],
          status: 'ENDPOINT_NOT_AVAILABLE'
        };
      } else {
        throw backendError;
      }
    }
  } catch (error) {
    console.error('Address search failed:', error);
    
    return {
      predictions: [],
      status: 'ERROR'
    };
  }
};

export const searchAddresses = withCache(
  (query) => query.toLowerCase(),
  searchAddressesFn
);
