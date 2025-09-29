import Constants from 'expo-constants';

interface OlaMapsPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface OlaGeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

interface OlaReverseGeocodeResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

class OlaMapsService {
  private apiKey: string;
  private baseUrl: string = 'https://api.olamaps.io/places/v1';

  constructor() {
    // Get API key from environment variables
    const extra = Constants.expoConfig?.extra;
    this.apiKey = extra?.EXPO_PUBLIC_OLA_KRUTRIM_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Ola Maps API key not found. Maps functionality will be limited.');
    }
  }

  /**
   * Search for places/addresses
   */
  async searchPlaces(query: string): Promise<OlaMapsPrediction[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Ola Maps API key not configured');
      }

      if (!query || query.trim().length < 3) {
        return [];
      }

      const response = await fetch(
        `${this.baseUrl}/autocomplete?input=${encodeURIComponent(query.trim())}&api_key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Ola Maps API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Ola Maps response to match your expected format
      const predictions = data.predictions || [];
      return predictions.map((prediction: any) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        structured_formatting: {
          main_text: prediction.structured_formatting?.main_text || prediction.description,
          secondary_text: prediction.structured_formatting?.secondary_text || '',
        },
      }));

    } catch (error) {
      console.error('Ola Maps search error:', error);
      return [];
    }
  }

  /**
   * Get coordinates for an address (geocoding)
   */
  async geocodeAddress(address: string): Promise<OlaGeocodeResult | null> {
    try {
      if (!this.apiKey) {
        throw new Error('Ola Maps API key not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/geocode?address=${encodeURIComponent(address)}&api_key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Ola Maps geocode error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formatted_address: result.formatted_address,
        };
      }

      return null;

    } catch (error) {
      console.error('Ola Maps geocode error:', error);
      return null;
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<OlaReverseGeocodeResult | null> {
    try {
      if (!this.apiKey) {
        throw new Error('Ola Maps API key not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/reverse-geocode?latlng=${latitude},${longitude}&api_key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Ola Maps reverse geocode error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          formatted_address: result.formatted_address,
          address_components: result.address_components || [],
        };
      }

      return null;

    } catch (error) {
      console.error('Ola Maps reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Get place details by place_id
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('Ola Maps API key not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/details?place_id=${placeId}&api_key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Ola Maps place details error: ${response.status}`);
      }

      const data = await response.json();
      return data.result;

    } catch (error) {
      console.error('Ola Maps place details error:', error);
      return null;
    }
  }

  /**
   * Parse address components into structured format
   */
  parseAddressComponents(addressComponents: any[]): {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  } {
    const parsed = {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    };

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('street_number') || types.includes('route')) {
        parsed.street += component.long_name + ' ';
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        parsed.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
      } else if (types.includes('postal_code')) {
        parsed.pincode = component.long_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
      }
    }

    parsed.street = parsed.street.trim();
    return parsed;
  }

  /**
   * Check if Ola Maps is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const olaMapsService = new OlaMapsService();