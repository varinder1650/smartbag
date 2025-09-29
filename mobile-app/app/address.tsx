import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface SavedAddress {
  _id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

interface ManualAddressForm {
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
}

export default function AddressScreen() {
  const { token, user } = useAuth();
  const params = useLocalSearchParams();
  const isFromCheckout = params.from === 'checkout';
  
  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationAddress, setLocationAddress] = useState<string>('');
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Manual address form states
  const [manualAddress, setManualAddress] = useState<ManualAddressForm>({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });
  
  // Saved addresses states
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  
  // General states
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'saved' | 'search'>('saved');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentLocation = useCallback(async () => {
    console.log('=== START getCurrentLocation ===');
    
    try {
      setLocationLoading(true);
      
      const currentStatus = await Location.getForegroundPermissionsAsync();
      
      if (!currentStatus.granted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Permission denied');
        }
      }
  
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude: lat, longitude: lng } = location.coords;
      console.log('Location received:', lat, lng);
      
      // Set coordinates immediately
      setLatitude(lat);
      setLongitude(lng);
      setLocationLoading(false); // Stop loading immediately
      
      // Check if coordinates are in India (rough bounds)
      const isInIndia = lat >= 8.4 && lat <= 37.6 && lng >= 68.7 && lng <= 97.25;
      
      if (!isInIndia) {
        console.log('Coordinates outside India, using default location');
        setLatitude(12.9716); // Bangalore
        setLongitude(77.5946);
        setLocationAddress('Bangalore, India - Please search your exact address');
        Alert.alert(
          'Location Notice',
          'Detected location is outside India. Defaulting to Bangalore. Please use search to find your address.',
          [{ text: 'OK' }]
        );
        return;
      }
  
      // Try reverse geocoding (non-blocking)
      getAddressFromCoordinates(lat, lng).catch(err => {
        console.log('Reverse geocoding failed (non-critical):', err);
        setLocationAddress('Location detected - Use search for exact address');
      });
      
    } catch (error) {
      console.error('Location error:', error);
      
      // Default to Bangalore
      setLatitude(12.9716);
      setLongitude(77.5946);
      setLocationAddress('Bangalore, India - Search or enter your address');
      setLocationLoading(false);
    }
  }, []);
 

  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    try {
      console.log('Starting reverse geocoding for:', lat, lng);
      
      // Add timeout to reverse geocoding
      const geocodePromise = fetch(`${API_BASE_URL}reverse-geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Reverse geocode timeout')), 8000)
      );
      
      const response = await Promise.race([geocodePromise, timeoutPromise]) as Response;
      console.log('Reverse geocode response received');
  
      if (response.ok) {
        const result = await response.json();
        
        if (result && result.formatted_address) {
          setLocationAddress(result.formatted_address);
          console.log('Address set:', result.formatted_address);
          
          // Parse and update form
          if (result.address_components) {
            const addressComponents = result.address_components;
            let street = '', city = '', state = '', pincode = '';
            
            for (const component of addressComponents) {
              const types = component.types || [];
              
              if (types.includes('street_number') || types.includes('route')) {
                street += component.long_name + ' ';
              } else if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
              } else if (types.includes('postal_code')) {
                pincode = component.long_name;
              }
            }
            
            setManualAddress(prev => ({
              ...prev,
              street: street.trim() || prev.street,
              city: city || prev.city,
              state: state || prev.state,
              pincode: pincode || prev.pincode,
            }));
          }
        }
      } else {
        console.log('Reverse geocode response not OK:', response.status);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Don't fail, just set a generic address
      setLocationAddress('Location detected - Use search for exact address');
    }
  }, []);

  // Fetch saved addresses
  const fetchSavedAddresses = useCallback(async () => {
    if (!token) return;
    
    setLoadingSavedAddresses(true);
    try {
      const response = await fetch(`${API_BASE_URL}address/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const addresses = await response.json();
        setSavedAddresses(addresses);
        
        const defaultAddress = addresses.find((addr: SavedAddress) => addr.is_default);
        if (defaultAddress && !selectedAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingSavedAddresses(false);
    }
  }, [token, selectedAddress]);

  // Search addresses using Ola Maps
  const performAddressSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}address/search-addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.predictions && data.predictions.length > 0) {
          setSearchResults(data.predictions);
          setShowSearchResults(true);
        } else {
          setSearchResults([{
            place_id: 'manual',
            description: query,
            structured_formatting: {
              main_text: query,
              secondary_text: 'Enter this address manually'
            }
          }]);
          setShowSearchResults(true);
        }
      } else {
        throw new Error(`Search failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSearchResults([{
        place_id: 'manual_fallback',
        description: query,
        structured_formatting: {
          main_text: query,
          secondary_text: 'Search failed - enter manually'
        }
      }]);
      setShowSearchResults(true);
    } finally {
      setSearching(false);
    }
  }, []);

  // Select search result
  const selectSearchResult = useCallback(async (result: SearchResult) => {
    setSearchQuery(result.description);
    setShowSearchResults(false);
    Keyboard.dismiss();
    
    if (result.place_id.includes('manual')) {
      const addressParts = result.description.split(',').map(s => s.trim());
      if (addressParts.length > 0) {
        setManualAddress(prev => ({
          ...prev,
          street: addressParts[0] || '',
          city: addressParts[1] || '',
          state: addressParts[2] || '',
        }));
      }
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}address/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: result.description }),
      });

      if (response.ok) {
        const geocodeResult = await response.json();
        
        if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
          setLatitude(geocodeResult.latitude);
          setLongitude(geocodeResult.longitude);
          setLocationAddress(geocodeResult.formatted_address || result.description);
          
          // Get detailed address and update form
          await getAddressFromCoordinates(geocodeResult.latitude, geocodeResult.longitude);
          
          // Auto-save this address
          Alert.alert(
            'Save Address',
            'Would you like to save this address?',
            [
              { text: 'Enter Manually', style: 'cancel' },
              { 
                text: 'Save', 
                onPress: () => saveSearchedAddress(result.description, geocodeResult.latitude, geocodeResult.longitude)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'Failed to get location details. Please enter address manually.');
    }
  }, []);

  // Save searched address
  const saveSearchedAddress = async (addressText: string, lat: number, lng: number) => {
    if (savedAddresses.length >= 5) {
      Alert.alert('Address Limit Reached', 'You can only save up to 5 addresses. Please delete an existing address first.');
      return;
    }

    const addressParts = addressText.split(',').map(s => s.trim());
    const city = addressParts.find(part => part.length > 2) || 'Unknown';
    const state = addressParts.length > 2 ? addressParts[addressParts.length - 2] : 'Unknown';
    const pincode = addressText.match(/\d{6}/)?.[0] || '';

    const addressData = {
      label: `Address ${savedAddresses.length + 1}`,
      street: addressText,
      city: city,
      state: state,
      pincode: pincode,
      landmark: '',
      latitude: lat,
      longitude: lng,
    };

    try {
      const response = await fetch(`${API_BASE_URL}address/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      if (response.ok) {
        await fetchSavedAddresses();
        Alert.alert('Success', 'Address saved successfully!');
        setCurrentTab('saved');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // Save manual address
  const saveManualAddress = async () => {
    if (!manualAddress.street.trim() || !manualAddress.city.trim() || !manualAddress.pincode.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Street, City, and Pincode)');
      return;
    }

    if (manualAddress.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (savedAddresses.length >= 5) {
      Alert.alert('Address Limit Reached', 'You can only save up to 5 addresses.');
      return;
    }

    setLoading(true);
    try {
      const addressData = {
        ...manualAddress,
        latitude: latitude || 0,
        longitude: longitude || 0,
      };

      const response = await fetch(`${API_BASE_URL}address/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Address saved successfully!');
        
        await fetchSavedAddresses();
        
        setManualAddress({
          label: 'Home',
          street: '',
          city: '',
          state: '',
          pincode: '',
          landmark: '',
        });
        
        setCurrentTab('saved');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Set default address
  const selectAndSetDefault = async (address: SavedAddress) => {
    try {
      const response = await fetch(`${API_BASE_URL}address/${address._id}/set-default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSelectedAddress(address);
        
        if (isFromCheckout) {
          const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;
          router.back();
          setTimeout(() => {
            router.setParams({
              address: address.street,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              fullAddress: fullAddress,
              addressLabel: address.label,
            });
          }, 100);
        } else {
          Alert.alert('Success', 'Default address updated successfully');
          await fetchSavedAddresses();
        }
      } else {
        Alert.alert('Error', 'Failed to set default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // Delete address
  const deleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}address/${addressId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Address deleted successfully');
                await fetchSavedAddresses();
              } else {
                Alert.alert('Error', 'Failed to delete address');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  // useEffect(() => {
  //   getCurrentLocation();
  //   fetchSavedAddresses();
  // }, []);

  useEffect(() => {
    console.log('Address screen mounted');
    
    // Load saved addresses immediately
    fetchSavedAddresses();
    
    // Set default location immediately (don't wait for GPS)
    setLatitude(19.0760);
    setLongitude(72.8777);
    setLocationLoading(false);
    setLocationAddress('Tap "Update Location" to detect your current position');
    
    // Don't auto-detect location on mount for emulator
    // Users can manually trigger it with the "Update Location" button
  }, []);
  
  // Search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performAddressSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performAddressSearch]);

  // Render location display (replaces map)
  const renderLocationDisplay = () => {
    if (latitude === null || longitude === null) {
      return (
        <View style={styles.locationContainer}>
          <View style={styles.locationLoadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.locationLoadingText}>Detecting your location...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.locationContainer}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={64} color="#007AFF" />
          <Text style={styles.locationTitle}>Current Location</Text>
          {locationAddress ? (
            <Text style={styles.locationAddress} numberOfLines={2}>
              {locationAddress}
            </Text>
          ) : (
            <Text style={styles.locationCoords}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.updateLocationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.updateLocationText}>Update Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render saved addresses
  const renderSavedAddress = ({ item }: { item: SavedAddress }) => (
    <View style={[
      styles.savedAddressCard,
      selectedAddress?._id === item._id && styles.selectedAddressCard
    ]}>
      <TouchableOpacity
        style={styles.addressContent}
        onPress={() => setSelectedAddress(item)}
      >
        <View style={styles.savedAddressHeader}>
          <View style={styles.addressLabelContainer}>
            <Ionicons 
              name={item.label === 'Home' ? 'home' : item.label === 'Office' ? 'business' : 'location'} 
              size={20} 
              color="#007AFF" 
            />
            <Text style={styles.addressLabel}>{item.label}</Text>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>
          {selectedAddress?._id === item._id && (
            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
          )}
        </View>
        
        <Text style={styles.savedAddressText} numberOfLines={2}>
          {`${item.street}, ${item.city}, ${item.state}, ${item.pincode}`}
        </Text>
        
        {item.landmark && (
          <Text style={styles.landmarkText}>Near: {item.landmark}</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.addressActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteAddress(item._id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render search results
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
      <Ionicons name="chevron-forward" size={16} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFromCheckout ? 'Select Delivery Address' : 'Manage Addresses'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'saved' && styles.activeTab]}
            onPress={() => setCurrentTab('saved')}
          >
            <Ionicons 
              name="home-outline" 
              size={20} 
              color={currentTab === 'saved' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, currentTab === 'saved' && styles.activeTabText]}>
              Saved Addresses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, currentTab === 'search' && styles.activeTab]}
            onPress={() => setCurrentTab('search')}
          >
            <Ionicons 
              name="add-outline" 
              size={20} 
              color={currentTab === 'search' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, currentTab === 'search' && styles.activeTabText]}>
              Add New Address
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Location Display Section */}
          <View style={styles.locationSection}>
            {renderLocationDisplay()}
          </View>

          {/* Saved Addresses Tab */}
          {currentTab === 'saved' && (
            <View style={styles.savedAddressesContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Addresses</Text>
                <Text style={styles.addressCount}>
                  {savedAddresses.length}/5 addresses
                </Text>
              </View>
              
              {loadingSavedAddresses ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : savedAddresses.length > 0 ? (
                <FlatList
                  data={savedAddresses}
                  renderItem={renderSavedAddress}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No saved addresses</Text>
                  <Text style={styles.emptySubtext}>Add your first address to get started</Text>
                  <TouchableOpacity
                    style={styles.addFirstAddressButton}
                    onPress={() => setCurrentTab('search')}
                  >
                    <Text style={styles.addFirstAddressText}>Add Address</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedAddress && (
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => selectAndSetDefault(selectedAddress)}
                >
                  <Text style={styles.selectButtonText}>Use Selected Address</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Add New Address Tab */}
          {currentTab === 'search' && (
            <View style={styles.searchContainer}>
              <Text style={styles.sectionTitle}>Add New Address</Text>
              <Text style={styles.sectionSubtitle}>Search for your address or enter manually</Text>
              
              {/* Search Section */}
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for an address..."
                  placeholderTextColor="#999"
                />
                {searching && (
                  <ActivityIndicator size="small" color="#007AFF" />
                )}
              </View>

              {showSearchResults && searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.place_id}
                    style={styles.searchResultsList}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Manual Entry Form */}
              <View style={styles.manualFormSection}>
                <View style={styles.sectionDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or enter manually</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address Label</Text>
                  <View style={styles.labelButtonsContainer}>
                    {['Home', 'Office', 'Other'].map((label) => (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.labelButton,
                          manualAddress.label === label && styles.labelButtonSelected
                        ]}
                        onPress={() => setManualAddress(prev => ({ ...prev, label }))}
                      >
                        <Text style={[
                          styles.labelButtonText,
                          manualAddress.label === label && styles.labelButtonTextSelected
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualAddress.street}
                    onChangeText={(text) => setManualAddress(prev => ({ ...prev, street: text }))}
                    placeholder="House no, building, street name"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.input}
                      value={manualAddress.city}
                      onChangeText={(text) => setManualAddress(prev => ({ ...prev, city: text }))}
                      placeholder="City name"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={manualAddress.state}
                      onChangeText={(text) => setManualAddress(prev => ({ ...prev, state: text }))}
                      placeholder="State name"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Pincode *</Text>
                    <TextInput
                      style={styles.input}
                      value={manualAddress.pincode}
                      onChangeText={(text) => setManualAddress(prev => ({ ...prev, pincode: text.replace(/\D/g, '').substring(0, 6) }))}
                      placeholder="6-digit pincode"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.inputLabel}>Landmark</Text>
                    <TextInput
                      style={styles.input}
                      value={manualAddress.landmark}
                      onChangeText={(text) => setManualAddress(prev => ({ ...prev, landmark: text }))}
                      placeholder="Optional"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                  onPress={saveManualAddress}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Address</Text>
                  )}
                </TouchableOpacity>
              </View>

              {savedAddresses.length >= 5 && (
                <View style={styles.limitWarning}>
                  <Ionicons name="warning-outline" size={16} color="#FF9500" />
                  <Text style={styles.limitWarningText}>
                    Maximum 5 addresses reached. Delete one to add a new address.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  locationSection: {
    margin: 16,
  },
  locationContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  locationLoadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  updateLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savedAddressesContainer: {
    padding: 16,
  },
  savedAddressCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedAddressCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  addressContent: {
    flex: 1,
    padding: 16,
  },
  savedAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  savedAddressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  addressActions: {
    paddingRight: 16,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  addFirstAddressButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstAddressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchResultsContainer: {
    marginBottom: 16,
  },
  searchResultsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
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
  manualFormSection: {
    marginTop: 16,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  labelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  labelButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  labelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  labelButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginTop: 16,
  },
  limitWarningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});