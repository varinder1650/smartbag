import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
let MapView, Marker;
if (Platform.OS !== 'web') {
  MapView = require('react-native-maps').default;
  Marker = require('react-native-maps').Marker;
}
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { reverseGeocode, searchAddresses, geocodeAddress } from '../services/api';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressData {
  address: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export default function AddressScreen() {
  const { token, user } = useAuth();
  const params = useLocalSearchParams();
  const isFromCheckout = params.from === 'checkout';
  
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(20.5937); // Default to India center
  const [longitude, setLongitude] = useState(78.9629);
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [updatingMap, setUpdatingMap] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const mapRef = useRef(null);
  const searchInputRef = useRef<TextInput>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getCurrentLocation();
    
    // Cleanup function to clear timeout
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [token, user]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timeoutId = setTimeout(() => {
        performAddressSearch(searchQuery);
      }, 300); // Reduced debounce time for better responsiveness
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const performAddressSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const data = await searchAddresses(query);
      
      if (data.predictions && data.predictions.length > 0) {
        setSearchResults(data.predictions);
        setShowSearchResults(true);
      } else {
        // Create a simple suggestion based on the query
        setSearchResults([{
          place_id: 'manual',
          description: query,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Enter manually'
          }
        }]);
        setShowSearchResults(true);
      }
    } catch (error: any) {
      // Check if it's a network error or API error
      if (error.response) {
        // API error - could show user-friendly message
      } else if (error.request) {
        // Network error - could show retry option
      } else {
        // Other error
      }
      
      // Fallback: create a simple suggestion
      setSearchResults([{
        place_id: 'manual',
        description: query,
        structured_formatting: {
          main_text: query,
          secondary_text: 'Enter manually'
        }
      }]);
      setShowSearchResults(true);
    } finally {
      setSearching(false);
    }
  };

  const updateMapFromAddress = async (addressText: string) => {
    if (!addressText.trim()) {
      return;
    }
    setUpdatingMap(true);
    try {
      const data = await geocodeAddress(addressText);
      
      if (data.latitude && data.longitude) {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setRegion({
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        
        if (data.note) {
        }
      } else {
        Alert.alert('Info', 'Could not get exact coordinates for this address. You can manually adjust the map location.');
      }
    } catch (error: any) {
      console.error('Error updating map from address:', error);
      
      if (error.response) {
      }
      
      Alert.alert('Info', 'Could not get exact coordinates for this address. You can manually adjust the map location.');
    } finally {
      setUpdatingMap(false);
    }
  };

  const selectSearchResult = async (result: SearchResult) => {
    setSearchQuery(result.description);
    setAddress(result.description);
    setShowSearchResults(false);
    setIsSearchFocused(false);
    Keyboard.dismiss();
    
    // Update map coordinates for the selected address
    await updateMapFromAddress(result.description);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to set your address');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = location.coords;
      
      setLatitude(lat);
      setLongitude(lng);
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (addressResponse.length > 0) {
        const addr = addressResponse[0];
        const fullAddress = [
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
        ].filter(Boolean).join(', ');
        setAddress(fullAddress);
        setSearchQuery(fullAddress);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
    
    // Get address for the selected location
    await getAddressFromCoordinates(lat, lng);
  };

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      // First try backend API for reverse geocoding
      let backendSuccess = false;
      try {
        const data = await reverseGeocode(lat, lng);
        
        if (data.formattedAddress) {
          setAddress(data.formattedAddress);
          setSearchQuery(data.formattedAddress);
          backendSuccess = true;
          return; // Success, exit early
        }
      } catch (backendError: any) {
      }
      
      // If backend failed, use Expo Location fallback
      if (!backendSuccess) {
        
        try {
          // Fallback: Use Expo Location for reverse geocoding
          const addressResponse = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

          if (addressResponse.length > 0) {
            const addr = addressResponse[0];
            const fullAddress = [
              addr.street,
              addr.district,
              addr.city,
              addr.region,
              addr.postalCode,
            ].filter(Boolean).join(', ');
            
            setAddress(fullAddress);
            setSearchQuery(fullAddress);
          } else {
            // If no address found, create a basic one from coordinates
            const basicAddress = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setAddress(basicAddress);
            setSearchQuery(basicAddress);
          }
        } catch (expoError) {
        }
      }
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      
      // Last resort: create address from coordinates
      const fallbackAddress = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      setSearchQuery(fallbackAddress);
    }
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a delivery address');
      return;
    }

    setLoading(true);
    try {
      if (isFromCheckout) {
        // For checkout flow, create address data and navigate back with parameters
        const addressParts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
        
        // Improved address parsing
        let city = '';
        let state = '';
        let pincode = '';
        
        // Look for pincode (6-digit number) at the end
        const pincodeMatch = address.match(/\b\d{6}\b/);
        if (pincodeMatch) {
          pincode = pincodeMatch[0];
        }
        
        // Remove pincode and "India" from address parts for better parsing
        const cleanParts = addressParts.filter(part => 
          part !== pincode && 
          part.toLowerCase() !== 'india' && 
          !/^\d{6}$/.test(part)
        );
        
        if (cleanParts.length >= 2) {
          // Last part is usually state, second to last is city
          city = cleanParts[cleanParts.length - 2] || '';
          state = cleanParts[cleanParts.length - 1] || '';
        } else if (cleanParts.length === 1) {
          city = cleanParts[0];
          state = '';
        }
        
        // If we couldn't find a pincode, try to extract from the end
        if (!pincode && addressParts.length > 0) {
          const lastPart = addressParts[addressParts.length - 1];
          if (/^\d{6}$/.test(lastPart)) {
            pincode = lastPart;
          }
        }
        
        const addressData: AddressData = {
          address: address.trim(),
          city: city,
          state: state,
          pincode: pincode,
          fullAddress: address.trim(),
          coordinates: {
            latitude,
            longitude,
          },
        };

        // Navigate back to checkout with address parameters
        router.back();
        
        // Use a timeout to ensure the navigation completes before setting params
        setTimeout(() => {
          router.setParams({
            address: addressData.address,
            city: addressData.city,
            state: addressData.state,
            pincode: addressData.pincode,
            fullAddress: addressData.fullAddress,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          });
        }, 100);
        
        return;
      }

      // Save to user profile (when called from home screen)
      const apiUrl = API_BASE_URL;

      // Use the same improved parsing for database save
      const addressParts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
      
      // Look for pincode (6-digit number) at the end
      const pincodeMatch = address.match(/\b\d{6}\b/);
      let pincode = '';
      if (pincodeMatch) {
        pincode = pincodeMatch[0];
      }
      
      // Remove pincode and "India" from address parts for better parsing
      const cleanParts = addressParts.filter(part => 
        part !== pincode && 
        part.toLowerCase() !== 'india' && 
        !/^\d{6}$/.test(part)
      );
      
      let city = '';
      let state = '';
      
      if (cleanParts.length >= 2) {
        // Last part is usually state, second to last is city
        city = cleanParts[cleanParts.length - 2] || '';
        state = cleanParts[cleanParts.length - 1] || '';
      } else if (cleanParts.length === 1) {
        city = cleanParts[0];
        state = '';
      }
      
      // If we couldn't find a pincode, try to extract from the end
      if (!pincode && addressParts.length > 0) {
        const lastPart = addressParts[addressParts.length - 1];
        if (/^\d{6}$/.test(lastPart)) {
          pincode = lastPart;
        }
      }

      const requestBody = {
        address: address.trim(),
        city: city,
        state: state,
        pincode: pincode,
        latitude,
        longitude,
      };

      const response = await fetch(`${apiUrl}/user/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        Alert.alert('Success', 'Address saved successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back and trigger a refresh
              router.back();
            }
          }
        ]);
      } else {
        const responseData = await response.json();
        Alert.alert('Error', responseData.detail || responseData.message || 'Failed to save address');
      }
    } catch (error: any) {
      console.error('❌ Error saving address:', error);
      
      // Check if it's a network error or API error
      if (error.response) {
      } else if (error.request) {
      } else {
      }
      
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => selectSearchResult(item)}
    >
      <Ionicons name="location-outline" size={20} color="#666" />
      <View style={styles.searchResultText}>
        <Text style={styles.searchResultMain}>{item.structured_formatting.main_text}</Text>
        <Text style={styles.searchResultSecondary}>{item.structured_formatting.secondary_text}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMapSection = () => (
    <View style={styles.mapSection}>
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && MapView && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: latitude,
              longitude: longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{
                latitude: latitude,
                longitude: longitude,
              }}
              title="Delivery Address"
              description="Tap and drag to adjust"
              draggable
              onDragEnd={async (e) => {
                const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                setLatitude(lat);
                setLongitude(lng);
                
                // Get address for the new location
                await getAddressFromCoordinates(lat, lng);
              }}
            />
          </MapView>
        )}
        {/* Center indicator */}
        <View style={styles.centerIndicator}>
          <Ionicons name="location" size={24} color="#007AFF" />
        </View>
        {/* Update Map Button */}
        <TouchableOpacity
          style={styles.updateMapButton}
          onPress={() => updateMapFromAddress(address)}
          disabled={updatingMap}
        >
          {updatingMap ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="map-outline" size={20} color="#fff" />
          )}
          <Text style={styles.updateMapText}>
            {updatingMap ? 'Updating...' : 'Update Map'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddressInputSection = () => (
    <View style={styles.addressInputSection}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Delivery Address</Text>
        <Text style={styles.inputHint}>Type your complete address below:</Text>
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setSearchQuery(text);
            // Trigger search immediately for better UX
            if (text.trim().length > 2) {
              performAddressSearch(text);
            } else {
              setSearchResults([]);
              setShowSearchResults(false);
            }
            // Debounce geocoding to avoid too many API calls
            if (geocodeTimeoutRef.current) {
              clearTimeout(geocodeTimeoutRef.current);
            }
            geocodeTimeoutRef.current = setTimeout(() => {
              if (text.trim().length > 10) {
                updateMapFromAddress(text);
              }
            }, 1000);
          }}
          placeholder="Example: 123 Main Street, Apartment 4B, Mumbai, Maharashtra 400001"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#999"
          returnKeyType="default"
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="words"
          enablesReturnKeyAutomatically={false}
        />
        <TouchableOpacity style={styles.useCurrentLocationButton} onPress={getCurrentLocation}>
          <Ionicons name="location-outline" size={20} color="#007AFF" />
          <Text style={styles.useCurrentLocationText}>Use Current Location</Text>
        </TouchableOpacity>
        

      </View>
    </View>
  );

  const renderSaveButton = () => (
    <View style={styles.saveButtonSection}>
      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
        onPress={handleSaveAddress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            {isFromCheckout ? 'Select Address' : 'Save Address'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFromCheckout ? 'Select Delivery Address' : 'Set Delivery Address'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Section - Fixed Position */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search for an address..."
                placeholderTextColor="#999"
                returnKeyType="search"
                blurOnSubmit={false}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searching && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoading} />
              )}
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Auto-complete Results - Fixed Position */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.place_id}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={false}
                contentContainerStyle={styles.searchResultsContent}
              />
            </View>
          )}
        </View>

        {/* Main Content - Scrollable */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          nestedScrollEnabled={false}
        >
          {renderMapSection()}
          {renderAddressInputSection()}
          {renderSaveButton()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchSection: {
    position: 'relative',
    zIndex: 1000,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  searchLoading: {
    marginLeft: 10,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
    maxHeight: 300,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultsContent: {
    paddingVertical: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultMain: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  searchResultSecondary: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mapSection: {
    marginTop: 16,
  },
  mapContainer: {
    height: Platform.OS === 'web' ? 0 : 250, // Hide map container on web
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  centerIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -24,
    zIndex: 1,
  },
  updateMapButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  updateMapText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addressInputSection: {
    marginTop: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  useCurrentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  saveButtonSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});