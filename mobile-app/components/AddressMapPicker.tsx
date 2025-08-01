import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { reverseGeocode } from '../services/api';

// Type definitions
interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface AddressData {
  address: string;
  city: string;
  state?: string;
  pincode: string;
  country: string;
  fullAddress: string;
  coordinates: LocationCoordinates;
}

interface AddressMapPickerProps {
  onAddressSelect: (address: AddressData) => void;
  initialLocation?: LocationCoordinates | null;
}

interface MapPressEvent {
  nativeEvent: {
    coordinate: LocationCoordinates;
  };
}

// Dynamically import MapView and Marker for non-web platforms
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  MapView = require('react-native-maps').default;
  Marker = require('react-native-maps').Marker;
}

const AddressMapPicker: React.FC<AddressMapPickerProps> = ({ 
  onAddressSelect, 
  initialLocation = null 
}) => {
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationCoordinates | null>(initialLocation);
  const [loading, setLoading] = useState<boolean>(true);
  const [address, setAddress] = useState<string>('');
  const [reverseGeocoding, setReverseGeocoding] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use the map.');
        setLoading(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      const newLocation: LocationCoordinates = { latitude, longitude };
      
      setLocation(newLocation);
      if (!selectedLocation) {
        setSelectedLocation(newLocation);
      }
      
      // Get address for current location
      await getAddressFromCoordinates(latitude, longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setLoading(false);
    }
  };

  const getAddressFromCoordinates = async (
    latitude: number, 
    longitude: number
  ): Promise<void> => {
    try {
      setReverseGeocoding(true);
      
      // First try backend API for reverse geocoding
      let backendSuccess = false;
      try {
        console.log('Trying backend reverse geocoding for:', latitude, longitude);
        const data = await reverseGeocode(latitude, longitude);
        
        console.log('Backend response data:', data);
        
        if (data.formattedAddress) {
          setAddress(data.formattedAddress);
          
          // Extract address components from the response
          const addressComponents = data.addressComponents || {};
          
          const addressData: AddressData = {
            address: addressComponents.street || '',
            city: addressComponents.city || '',
            state: addressComponents.state,
            pincode: addressComponents.pincode || '',
            country: addressComponents.country || 'India',
            fullAddress: data.formattedAddress,
            coordinates: { latitude, longitude }
          };
          
          onAddressSelect(addressData);
          backendSuccess = true;
          console.log('Backend reverse geocoding successful');
          return; // Success, exit early
        }
      } catch (backendError: any) {
        console.log('Backend reverse geocoding failed with error:', backendError);
        // Check if it's a 503 error (service unavailable)
        if (backendError.response && backendError.response.status === 503) {
          console.log('Backend service unavailable (503), using Expo Location fallback');
        } else {
          console.log('Other backend error, using Expo Location fallback');
        }
      }
      
      // If backend failed, use Expo Location fallback
      if (!backendSuccess) {
        console.log('Using Expo Location fallback for reverse geocoding');
        
        try {
          // Fallback: Use Expo Location for reverse geocoding
          const addressResponse = await Location.reverseGeocodeAsync({
            latitude: latitude,
            longitude: longitude,
          });

          console.log('Expo Location response:', addressResponse);

          if (addressResponse.length > 0) {
            const addr = addressResponse[0];
            const fullAddress = [
              addr.street,
              addr.district,
              addr.city,
              addr.region,
              addr.postalCode,
            ].filter(Boolean).join(', ');
            
            console.log('Expo Location address:', fullAddress);
            setAddress(fullAddress);
            
            const addressData: AddressData = {
              address: addr.street || '',
              city: addr.city || '',
              state: addr.region,
              pincode: addr.postalCode || '',
              country: addr.country || 'India',
              fullAddress: fullAddress,
              coordinates: { latitude, longitude }
            };
            
            onAddressSelect(addressData);
          } else {
            // If no address found, create a basic one from coordinates
            const basicAddress = `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            console.log('No address found, using coordinates:', basicAddress);
            setAddress(basicAddress);
            
            const addressData: AddressData = {
              address: 'Selected Location',
              city: 'Unknown',
              pincode: '',
              country: 'India',
              fullAddress: basicAddress,
              coordinates: { latitude, longitude }
            };
            
            onAddressSelect(addressData);
          }
        } catch (expoError) {
          console.log('Expo Location also failed:', expoError);
          
          // Last resort: create address from coordinates
          const fallbackAddress = `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          console.log('Using last resort fallback:', fallbackAddress);
          setAddress(fallbackAddress);
          
          const addressData: AddressData = {
            address: 'Selected Location',
            city: 'Unknown',
            pincode: '',
            country: 'India',
            fullAddress: fallbackAddress,
            coordinates: { latitude, longitude }
          };
          
          onAddressSelect(addressData);
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
      
      // Last resort: create address from coordinates
      const fallbackAddress = `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      console.log('Using last resort fallback:', fallbackAddress);
      setAddress(fallbackAddress);
      
      const addressData: AddressData = {
        address: 'Selected Location',
        city: 'Unknown',
        pincode: '',
        country: 'India',
        fullAddress: fallbackAddress,
        coordinates: { latitude, longitude }
      };
      
      onAddressSelect(addressData);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleMapPress = async (event: MapPressEvent): Promise<void> => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation: LocationCoordinates = { latitude, longitude };
    
    setSelectedLocation(newLocation);
    await getAddressFromCoordinates(latitude, longitude);
  };

  const handleConfirmLocation = (): void => {
    if (selectedLocation && address) {
      const addressParts = address.split(',');
      const addressData: AddressData = {
        address: addressParts[0]?.trim() || '',
        city: addressParts[1]?.trim() || '',
        pincode: addressParts[addressParts.length - 1]?.trim() || '',
        country: 'India',
        fullAddress: address,
        coordinates: selectedLocation
      };
      onAddressSelect(addressData);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not get location</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && MapView && Marker && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            ...location,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              title="Selected Location"
              description={address}
            />
          )}
        </MapView>
      )}
      
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Selected Address:</Text>
        <Text style={styles.addressText}>
          {reverseGeocoding ? 'Getting address...' : (address || 'Tap on map to select location')}
        </Text>
        
        {reverseGeocoding && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.geocodingLoader} />
        )}
        
        {selectedLocation && address && !reverseGeocoding && (
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLocation}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={getCurrentLocation}
      >
        <Ionicons name="locate" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  map: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
  addressContainer: ViewStyle;
  addressLabel: TextStyle;
  addressText: TextStyle;
  confirmButton: ViewStyle;
  confirmButtonText: TextStyle;
  myLocationButton: ViewStyle;
  geocodingLoader: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    height: Platform.OS === 'web' ? 0 : undefined,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  myLocationButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  geocodingLoader: {
    marginTop: 10,
  },
});

export default AddressMapPicker;