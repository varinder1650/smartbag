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
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = 'http://10.0.0.74:3001/api';

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
  const { token } = useAuth();
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
  const mapRef = useRef(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getCurrentLocation();
    
    // Cleanup function to clear timeout
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timeoutId = setTimeout(() => {
        searchAddresses(searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const searchAddresses = async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/address/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // If no results from API, create a simple suggestion
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
      } else {
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
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
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
    if (!addressText.trim()) return;
    
    setUpdatingMap(true);
    try {
      const response = await fetch(`${API_BASE_URL}/address/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: addressText }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          setRegion({
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          console.log('Map updated with coordinates:', data.latitude, data.longitude);
        } else {
          console.log('Geocoding failed for address:', addressText);
          // Fallback: use default coordinates and show a message
          Alert.alert('Info', 'Could not get exact coordinates for this address. You can manually adjust the map location.');
        }
      } else {
        console.log('Geocoding failed for address:', addressText);
        // Fallback: use default coordinates and show a message
        Alert.alert('Info', 'Could not get exact coordinates for this address. You can manually adjust the map location.');
      }
    } catch (error) {
      console.error('Error updating map from address:', error);
      // Fallback: use default coordinates and show a message
      Alert.alert('Info', 'Could not get exact coordinates for this address. You can manually adjust the map location.');
    } finally {
      setUpdatingMap(false);
    }
  };

  const selectSearchResult = async (result: SearchResult) => {
    setSearchQuery(result.description);
    setAddress(result.description);
    setShowSearchResults(false);
    
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

  const handleMapPress = (event: any) => {
    const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Please login to save your address');
      return;
    }

    setLoading(true);
    try {
      // If called from checkout, format the address data and go back
      if (isFromCheckout) {
        const addressData: AddressData = {
          address: address.split(',')[0] || address,
          city: address.split(',')[1]?.trim() || '',
          state: address.split(',')[2]?.trim() || '',
          pincode: address.split(',').pop()?.trim() || '',
          fullAddress: address,
          coordinates: { latitude, longitude }
        };
        
        // Navigate back to checkout with the address data as URL parameters
        const addressParams = {
          address: addressData.address,
          city: addressData.city,
          state: addressData.state,
          pincode: addressData.pincode,
          fullAddress: addressData.fullAddress,
          latitude: addressData.coordinates?.latitude.toString() || '',
          longitude: addressData.coordinates?.longitude.toString() || ''
        };
        
        // Navigate back to checkout with address parameters
        router.back();
        return;
      }

      // Save to user profile (when called from home screen)
      console.log('Saving address to database:', {
        address: address.trim(),
        latitude,
        longitude
      });

      const response = await fetch(`${API_BASE_URL}/user/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          latitude,
          longitude,
        }),
      });

      const responseData = await response.json();
      console.log('Save address response:', response.status, responseData);

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
        Alert.alert('Error', responseData.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
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

  const renderHeader = () => (
    <View>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for an address..."
            placeholderTextColor="#999"
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searching && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoading} />
          )}
        </View>
        
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.place_id}
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            />
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
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
            onDragEnd={(e) => {
              const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
        </MapView>
        
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

      {/* Address Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Delivery Address</Text>
        <Text style={styles.inputHint}>Type your complete address below:</Text>
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setSearchQuery(text);
            
            // Debounce geocoding to avoid too many API calls
            if (geocodeTimeoutRef.current) {
              clearTimeout(geocodeTimeoutRef.current);
            }
            geocodeTimeoutRef.current = setTimeout(() => {
              if (text.trim().length > 10) { // Only geocode if address is substantial
                updateMapFromAddress(text);
              }
            }, 1000); // Wait 1 second after user stops typing
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

      {/* Save Button */}
      <View style={styles.buttonContainer}>
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={true}
        />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  },
  searchLoading: {
    marginLeft: 10,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    marginLeft: 10,
  },
  searchResultMain: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  searchResultSecondary: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
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
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    marginBottom: 8,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  useCurrentLocationText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 16,
  },
  updateMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
  },
  updateMapText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
  },
}); 