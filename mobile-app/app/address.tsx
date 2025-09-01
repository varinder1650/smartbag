// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   Alert,
//   Dimensions,
//   KeyboardAvoidingView,
//   Platform,
//   FlatList,
//   ActivityIndicator,
//   Keyboard,
//   ScrollView,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { router, useLocalSearchParams } from 'expo-router';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// let MapView: any, Marker: any;
// try {
//   if (Platform.OS !== 'web') {
//     const Maps = require('react-native-maps');
//     MapView = Maps.default;
//     Marker = Maps.Marker;
//   }
// } catch (error) {
//   console.log('Maps not available:', error);
//   MapView = null;
//   Marker = null;
// }

// import * as Location from 'expo-location';
// import { useAuth } from '../contexts/AuthContext';
// import { searchAddresses, geocodeAddress, reverseGeocode } from '../services/api';
// import { API_BASE_URL } from '../config/apiConfig';

// const { width, height } = Dimensions.get('window');

// interface SearchResult {
//   place_id: string;
//   description: string;
//   structured_formatting: {
//     main_text: string;
//     secondary_text: string;
//   };
// }

// interface AddressData {
//   address: string;
//   city: string;
//   state: string;
//   pincode: string;
//   fullAddress: string;
//   coordinates?: {
//     latitude: number;
//     longitude: number;
//   };
// }

// export default function AddressScreen() {
//   const { token, user } = useAuth();
//   const params = useLocalSearchParams();
//   const isFromCheckout = params.from === 'checkout';
  
//   const [address, setAddress] = useState('');
//   const [latitude, setLatitude] = useState<number | null>(null);
//   const [longitude, setLongitude] = useState<number | null>(null);
//   const [region, setRegion] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
//   const [searching, setSearching] = useState(false);
//   const [showSearchResults, setShowSearchResults] = useState(false);
//   const [updatingMap, setUpdatingMap] = useState(false);
//   const [isSearchFocused, setIsSearchFocused] = useState(false);
//   const [locationLoading, setLocationLoading] = useState(true);
//   const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
//   const [apiEndpointsAvailable, setApiEndpointsAvailable] = useState({
//     search: true,
//     geocode: true,
//     reverseGeocode: true,
//   });
  
//   const mapRef = useRef(null);
//   const searchInputRef = useRef<TextInput>(null);
//   const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const locationCacheRef = useRef<{location: any, timestamp: number} | null>(null);

//   // ✅ Fixed performAddressSearch with proper error handling
//   const performAddressSearch = useCallback(async (query: string) => {
//     if (!query.trim()) return;
    
//     console.log('🔍 Starting address search for:', query);
    
//     setSearching(true);
//     try {
//       console.log('📡 Calling search API through service...');
//       const data = await searchAddresses(query);
//       console.log('📋 Search API returned:', data);
      
//       if (data && data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
//         console.log('✅ Got', data.predictions.length, 'predictions');
//         setSearchResults(data.predictions);
//         setShowSearchResults(true);
        
//         // Mark search as working
//         setApiEndpointsAvailable(prev => ({ ...prev, search: true }));
//       } else {
//         console.log('⚠️ No predictions returned from API');
        
//         // Create fallback results
//         const fallbackResults: SearchResult[] = [
//           {
//             place_id: 'manual',
//             description: query,
//             structured_formatting: {
//               main_text: query,
//               secondary_text: 'Enter this address manually'
//             }
//           }
//         ];
        
//         // Add some common cities if query matches
//         const commonCities = [
//           { name: 'Mumbai', state: 'Maharashtra' },
//           { name: 'Delhi', state: 'Delhi' },
//           { name: 'Bangalore', state: 'Karnataka' },
//           { name: 'Chennai', state: 'Tamil Nadu' },
//           { name: 'Kolkata', state: 'West Bengal' },
//           { name: 'Pune', state: 'Maharashtra' },
//           { name: 'Hyderabad', state: 'Telangana' },
//         ];
        
//         commonCities.forEach(city => {
//           if (city.name.toLowerCase().includes(query.toLowerCase()) || 
//               query.toLowerCase().includes(city.name.toLowerCase())) {
//             fallbackResults.unshift({
//               place_id: `city_${city.name.toLowerCase()}`,
//               description: `${city.name}, ${city.state}, India`,
//               structured_formatting: {
//                 main_text: city.name,
//                 secondary_text: `${city.state}, India`
//               }
//             });
//           }
//         });
        
//         setSearchResults(fallbackResults);
//         setShowSearchResults(true);
//       }
//     } catch (error: any) {
//       console.error('❌ Search error:', error);
      
//       // Check error type and mark endpoints accordingly
//       if (error.response?.status === 404) {
//         console.log('🚫 404 error - marking search endpoint as unavailable');
//         setApiEndpointsAvailable(prev => ({ ...prev, search: false }));
//       }
      
//       // Always provide a manual entry option
//       setSearchResults([{
//         place_id: 'manual_fallback',
//         description: query,
//         structured_formatting: {
//           main_text: query,
//           secondary_text: 'Search failed - enter manually'
//         }
//       }]);
//       setShowSearchResults(true);
//     } finally {
//       setSearching(false);
//     }
//   }, []);

//   const updateMapFromAddress = useCallback(async (addressText: string) => {
//     if (!addressText.trim()) return;
    
//     console.log('🗺️ Updating map from address:', addressText);
    
//     setUpdatingMap(true);
//     try {
//       console.log('📡 Calling geocoding API through service...');
//       const data = await geocodeAddress(addressText);
//       console.log('📋 Geocoding API returned:', data);
      
//       if (data && data.latitude && data.longitude) {
//         console.log('✅ Got coordinates:', data.latitude, data.longitude);
//         setLatitude(data.latitude);
//         setLongitude(data.longitude);
//         setRegion({
//           latitude: data.latitude,
//           longitude: data.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         });
        
//         // Animate map to new location if map exists
//         if (mapRef.current && Platform.OS !== 'web' && MapView) {
//           (mapRef.current as any).animateToRegion({
//             latitude: data.latitude,
//             longitude: data.longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           }, 1000);
//         }
        
//         // Mark geocoding as working
//         setApiEndpointsAvailable(prev => ({ ...prev, geocode: true }));
//       } else {
//         console.log('⚠️ No coordinates returned from geocoding');
//         setApiEndpointsAvailable(prev => ({ ...prev, geocode: false }));
//       }
//     } catch (error: any) {
//       console.error('❌ Geocoding error:', error);
      
//       if (error.response?.status === 404) {
//         setApiEndpointsAvailable(prev => ({ ...prev, geocode: false }));
//       }
//     } finally {
//       setUpdatingMap(false);
//     }
//   }, []);

//   const selectSearchResult = useCallback(async (result: SearchResult) => {
//     console.log('📍 Selected search result:', result);
    
//     setSearchQuery(result.description);
//     setAddress(result.description);
//     setShowSearchResults(false);
//     setIsSearchFocused(false);
//     Keyboard.dismiss();
    
//     // Try to update map coordinates for the selected address
//     await updateMapFromAddress(result.description);
//   }, [updateMapFromAddress]);

//   const getAddressFromCoordinates = useCallback(async (lat: number, lng: number, isInitial = false) => {
//     console.log('🔄 Getting address from coordinates:', lat, lng);
    
//     try {
//       // For initial load, try device's reverse geocoding first for speed
//       if (isInitial) {
//         try {
//           const addressResponse = await Location.reverseGeocodeAsync({
//             latitude: lat,
//             longitude: lng,
//           });

//           if (addressResponse.length > 0) {
//             const addr = addressResponse[0];
//             const fullAddress = [
//               addr.street,
//               addr.district,
//               addr.city,
//               addr.region,
//               addr.postalCode,
//             ].filter(Boolean).join(', ');
            
//             console.log('✅ Got address from device:', fullAddress);
//             setAddress(fullAddress);
//             setSearchQuery(fullAddress);
//             return;
//           }
//         } catch (expoError) {
//           console.log('Device geocoding failed:', expoError);
//         }
//       }

//       // Try your backend API
//       if (apiEndpointsAvailable.reverseGeocode) {
//         try {
//           console.log('📡 Calling reverse geocoding API through service...');
//           const data = await reverseGeocode(lat, lng);
//           console.log('📋 Reverse geocoding API returned:', data);
          
//           if (data && data.formattedAddress) {
//             console.log('✅ Got address from API:', data.formattedAddress);
//             setAddress(data.formattedAddress);
//             setSearchQuery(data.formattedAddress);
//             setApiEndpointsAvailable(prev => ({ ...prev, reverseGeocode: true }));
//             return;
//           }
//         } catch (backendError: any) {
//           console.error('❌ Backend reverse geocoding failed:', backendError);
//           if (backendError.response?.status === 404) {
//             setApiEndpointsAvailable(prev => ({ ...prev, reverseGeocode: false }));
//           }
//         }
//       }
      
//       // Final fallback: coordinate-based address
//       const fallbackAddress = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//       console.log('⚠️ Using fallback address:', fallbackAddress);
//       setAddress(fallbackAddress);
//       setSearchQuery(fallbackAddress);
//     } catch (error) {
//       console.error('❌ All address methods failed:', error);
//       const fallbackAddress = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//       setAddress(fallbackAddress);
//       setSearchQuery(fallbackAddress);
//     }
//   }, [apiEndpointsAvailable.reverseGeocode]);

//   const getCurrentLocation = useCallback(async (useCache = true) => {
//     try {
//       // Check cache first (5 minute cache)
//       if (useCache && locationCacheRef.current) {
//         const cacheAge = Date.now() - locationCacheRef.current.timestamp;
//         if (cacheAge < 5 * 60 * 1000) { // 5 minutes
//           const cached = locationCacheRef.current.location;
//           setLatitude(cached.latitude);
//           setLongitude(cached.longitude);
//           setRegion({
//             latitude: cached.latitude,
//             longitude: cached.longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           });
//           setLocationLoading(false);
//           return;
//         }
//       }

//       setLocationLoading(true);
//       const { status } = await Location.requestForegroundPermissionsAsync();
      
//       if (status !== 'granted') {
//         setLocationPermissionDenied(true);
//         setLocationLoading(false);
//         // Fallback to Mumbai
//         const fallbackLat = 19.0760;
//         const fallbackLng = 72.8777;
//         setLatitude(fallbackLat);
//         setLongitude(fallbackLng);
//         setRegion({
//           latitude: fallbackLat,
//           longitude: fallbackLng,
//           latitudeDelta: 0.1,
//           longitudeDelta: 0.1,
//         });
//         Alert.alert(
//           'Location Permission', 
//           'Location permission was denied. You can still manually enter or search for your address.',
//           [{ text: 'OK' }]
//         );
//         return;
//       }

//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High,
//       });

//       const { latitude: lat, longitude: lng } = location.coords;
      
//       // Cache the location
//       locationCacheRef.current = {
//         location: { latitude: lat, longitude: lng },
//         timestamp: Date.now()
//       };
      
//       setLatitude(lat);
//       setLongitude(lng);
//       setRegion({
//         latitude: lat,
//         longitude: lng,
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01,
//       });

//       // Get address from coordinates
//       await getAddressFromCoordinates(lat, lng, true);
      
//     } catch (error: any) {
//       console.error('Error getting location:', error);
//       setLocationPermissionDenied(true);
//       // Fallback to Mumbai coordinates
//       const fallbackLat = 19.0760;
//       const fallbackLng = 72.8777;
//       setLatitude(fallbackLat);
//       setLongitude(fallbackLng);
//       setRegion({
//         latitude: fallbackLat,
//         longitude: fallbackLng,
//         latitudeDelta: 0.1,
//         longitudeDelta: 0.1,
//       });
      
//       Alert.alert(
//         'Location Error', 
//         'Could not get your current location. You can manually enter or search for your address.',
//         [{ text: 'OK' }]
//       );
//     } finally {
//       setLocationLoading(false);
//     }
//   }, [getAddressFromCoordinates]);

//   const parseAddress = useCallback((addressText: string) => {
//     const addressParts = addressText.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
//     let city = '';
//     let state = '';
//     let pincode = '';
    
//     // Look for pincode (6-digit number)
//     const pincodeMatch = addressText.match(/\b\d{6}\b/);
//     if (pincodeMatch) {
//       pincode = pincodeMatch[0];
//     }
    
//     // Remove pincode and "India" from address parts for better parsing
//     const cleanParts = addressParts.filter(part => 
//       part !== pincode && 
//       part.toLowerCase() !== 'india' && 
//       !/^\d{6}$/.test(part)
//     );
    
//     if (cleanParts.length >= 2) {
//       city = cleanParts[cleanParts.length - 2] || '';
//       state = cleanParts[cleanParts.length - 1] || '';
//     } else if (cleanParts.length === 1) {
//       city = cleanParts[0];
//       state = '';
//     }
    
//     return { city, state, pincode };
//   }, []);

//   const handleSaveAddress = useCallback(async () => {
//     if (!address.trim()) {
//       Alert.alert('Error', 'Please enter a delivery address');
//       return;
//     }

//     setLoading(true);
//     try {
//       if (isFromCheckout) {
//         // For checkout flow, create address data and navigate back
//         const { city, state, pincode } = parseAddress(address);
        
//         const addressData: AddressData = {
//           address: address.trim(),
//           city: city,
//           state: state,
//           pincode: pincode,
//           fullAddress: address.trim(),
//           coordinates: latitude && longitude ? {
//             latitude,
//             longitude,
//           } : undefined,
//         };

//         console.log('💾 Saving address for checkout:', addressData);

//         // Navigate back to checkout with address parameters
//         router.back();
        
//         // Set params for checkout screen
//         setTimeout(() => {
//           router.setParams({
//             address: addressData.address,
//             city: addressData.city,
//             state: addressData.state,
//             pincode: addressData.pincode,
//             fullAddress: addressData.fullAddress,
//             latitude: latitude?.toString() || '',
//             longitude: longitude?.toString() || '',
//           });
//         }, 100);
        
//         return;
//       }

//       // Save to user profile (when called from profile/settings)
//       const { city, state, pincode } = parseAddress(address);

//       const requestBody = {
//         address: address.trim(),
//         city: city,
//         state: state,
//         pincode: pincode,
//         latitude: latitude || 0,
//         longitude: longitude || 0,
//       };

//       console.log('💾 Saving address to profile:', requestBody);

//       try {
//         const response = await fetch(`${API_BASE_URL.replace('/api', '')}/user/address`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`,
//           },
//           body: JSON.stringify(requestBody),
//         });

//         if (response.ok) {
//           Alert.alert('Success', 'Address saved successfully', [
//             { 
//               text: 'OK', 
//               onPress: () => {
//                 router.back();
//               }
//             }
//           ]);
//         } else {
//           const responseData = await response.json();
//           Alert.alert('Error', responseData.detail || responseData.message || 'Failed to save address');
//         }
//       } catch (apiError) {
//         console.error('API Error saving address:', apiError);
//         Alert.alert('Info', 'Address saved locally. API endpoint not available yet.', [
//           { 
//             text: 'OK', 
//             onPress: () => {
//               router.back();
//             }
//           }
//         ]);
//       }
//     } catch (error: any) {
//       console.error('❌ Error saving address:', error);
//       Alert.alert('Error', 'Failed to save address. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   }, [address, latitude, longitude, parseAddress, isFromCheckout, token]);

//   const handleMapPress = useCallback(async (event: any) => {
//     const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
//     console.log('🗺️ Map pressed at:', lat, lng);
//     setLatitude(lat);
//     setLongitude(lng);
    
//     // Get address for the selected location
//     await getAddressFromCoordinates(lat, lng);
//   }, [getAddressFromCoordinates]);

//   // ✅ Effect to fetch current location on mount
//   useEffect(() => {
//     console.log('🚀 AddressScreen mounted');
//     getCurrentLocation(false);
    
//     return () => {
//       if (geocodeTimeoutRef.current) {
//         clearTimeout(geocodeTimeoutRef.current);
//       }
//       if (searchTimeoutRef.current) {
//         clearTimeout(searchTimeoutRef.current);
//       }
//     };
//   }, []);

//   // ✅ Effect for search with proper debouncing
//   useEffect(() => {
//     if (searchTimeoutRef.current) {
//       clearTimeout(searchTimeoutRef.current);
//     }

//     if (searchQuery.length > 2) {
//       searchTimeoutRef.current = setTimeout(() => {
//         performAddressSearch(searchQuery);
//       }, 300);
//     } else {
//       setSearchResults([]);
//       setShowSearchResults(false);
//     }

//     return () => {
//       if (searchTimeoutRef.current) {
//         clearTimeout(searchTimeoutRef.current);
//       }
//     };
//   }, [searchQuery, performAddressSearch]);

//   const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => (
//     <TouchableOpacity
//       style={styles.searchResultItem}
//       onPress={() => selectSearchResult(item)}
//     >
//       <Ionicons 
//         name="location-outline" 
//         size={20} 
//         color="#666" 
//       />
//       <View style={styles.searchResultText}>
//         <Text style={styles.searchResultMain}>{item.structured_formatting.main_text}</Text>
//         <Text style={styles.searchResultSecondary}>{item.structured_formatting.secondary_text}</Text>
//       </View>
//     </TouchableOpacity>
//   ), [selectSearchResult]);

//   const renderMapSection = useCallback(() => {
//     // Don't render map until we have coordinates
//     if (latitude === null || longitude === null) {
//       return (
//         <View style={styles.mapSection}>
//           <View style={[styles.mapContainer, styles.mapLoadingContainer]}>
//             {locationLoading ? (
//               <View style={styles.mapLoadingContent}>
//                 <ActivityIndicator size="large" color="#007AFF" />
//                 <Text style={styles.mapLoadingText}>Getting your location...</Text>
//               </View>
//             ) : (
//               <View style={styles.mapLoadingContent}>
//                 <Ionicons name="location-outline" size={48} color="#ccc" />
//                 <Text style={styles.mapLoadingText}>Location not available</Text>
//                 <TouchableOpacity 
//                   style={styles.retryLocationButton} 
//                   onPress={() => getCurrentLocation(false)}
//                 >
//                   <Text style={styles.retryLocationText}>Try Again</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         </View>
//       );
//     }

//     return (
//       <View style={styles.mapSection}>
//         <View style={styles.mapContainer}>
//           {Platform.OS !== 'web' && MapView && (
//             <MapView
//               ref={mapRef}
//               style={styles.map}
//               region={region}
//               onPress={handleMapPress}
//               showsUserLocation={true}
//               showsMyLocationButton={true}
//               showsCompass={true}
//               showsScale={true}
//               loadingEnabled={true}
//               loadingIndicatorColor="#007AFF"
//               mapType="standard"
//             >
//               {Marker && (
//                 <Marker
//                   coordinate={{
//                     latitude: latitude,
//                     longitude: longitude,
//                   }}
//                   title="Delivery Address"
//                   description="Tap and drag to adjust"
//                   draggable
//                   onDragEnd={async (e: any) => {
//                     const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
//                     setLatitude(lat);
//                     setLongitude(lng);
//                     await getAddressFromCoordinates(lat, lng);
//                   }}
//                 />
//               )}
//             </MapView>
//           )}
          
//           {/* Update Map Button */}
//           <TouchableOpacity
//             style={styles.updateMapButton}
//             onPress={() => updateMapFromAddress(address)}
//             disabled={updatingMap}
//           >
//             {updatingMap ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <Ionicons name="map-outline" size={20} color="#fff" />
//             )}
//             <Text style={styles.updateMapText}>
//               {updatingMap ? 'Updating...' : 'Update Map'}
//             </Text>
//           </TouchableOpacity>

//           {/* Current Location Button */}
//           <TouchableOpacity
//             style={styles.currentLocationButton}
//             onPress={() => getCurrentLocation(false)}
//             disabled={locationLoading}
//           >
//             {locationLoading ? (
//               <ActivityIndicator size="small" color="#007AFF" />
//             ) : (
//               <Ionicons name="locate" size={20} color="#007AFF" />
//             )}
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }, [latitude, longitude, region, locationLoading, handleMapPress, updateMapFromAddress, address, updatingMap, getCurrentLocation]);

//   const renderAddressInputSection = useCallback(() => (
//     <View style={styles.addressInputSection}>
//       <View style={styles.inputContainer}>
//         <Text style={styles.inputLabel}>Delivery Address</Text>
//         <Text style={styles.inputHint}>Type your complete address below:</Text>
//         <TextInput
//           style={styles.addressInput}
//           value={address}
//           onChangeText={(text) => {
//             setAddress(text);
//             setSearchQuery(text);
            
//             // Clear existing timeouts
//             if (geocodeTimeoutRef.current) {
//               clearTimeout(geocodeTimeoutRef.current);
//             }
            
//             // Debounce geocoding
//             if (apiEndpointsAvailable.geocode) {
//               geocodeTimeoutRef.current = setTimeout(() => {
//                 if (text.trim().length > 10) {
//                   updateMapFromAddress(text);
//                 }
//               }, 1000);
//             }
//           }}
//           placeholder="Example: 123 Main Street, Apartment 4B, Mumbai, Maharashtra 400001"
//           multiline
//           numberOfLines={4}
//           textAlignVertical="top"
//           placeholderTextColor="#999"
//           returnKeyType="default"
//           blurOnSubmit={false}
//           autoCorrect={false}
//           autoCapitalize="words"
//         />
        
//         <View style={styles.buttonRow}>
//           <TouchableOpacity 
//             style={styles.useCurrentLocationButton} 
//             onPress={() => getCurrentLocation(false)}
//             disabled={locationLoading}
//           >
//             {locationLoading ? (
//               <ActivityIndicator size="small" color="#007AFF" />
//             ) : (
//               <Ionicons name="location-outline" size={20} color="#007AFF" />
//             )}
//             <Text style={styles.useCurrentLocationText}>
//               {locationLoading ? 'Getting Location...' : 'Use Current Location'}
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity 
//             style={styles.manualEntryButton}
//             onPress={() => {
//               router.push('/manual-address');
//             }}
//           >
//             <Ionicons name="create-outline" size={20} color="#666" />
//             <Text style={styles.manualEntryText}>Enter Manually</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   ), [address, locationLoading, updateMapFromAddress, getCurrentLocation, apiEndpointsAvailable.geocode]);

//   const renderSaveButton = useCallback(() => (
//     <View style={styles.saveButtonSection}>
//       <TouchableOpacity 
//         style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
//         onPress={handleSaveAddress}
//         disabled={loading}
//       >
//         {loading ? (
//           <ActivityIndicator color="#fff" />
//         ) : (
//           <Text style={styles.saveButtonText}>
//             {isFromCheckout ? 'Select Address' : 'Save Address'}
//           </Text>
//         )}
//       </TouchableOpacity>
//     </View>
//   ), [loading, handleSaveAddress, isFromCheckout]);

//   // Main render
//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView 
//         style={styles.container} 
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color="#333" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>
//             {isFromCheckout ? 'Select Delivery Address' : 'Set Delivery Address'}
//           </Text>
//           <View style={styles.placeholder} />
//         </View>

//         {/* Search Section */}
//         <View style={styles.searchSection}>
//           <View style={styles.searchContainer}>
//             <View style={styles.searchInputContainer}>
//               <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
//               <TextInput
//                 ref={searchInputRef}
//                 style={styles.searchInput}
//                 value={searchQuery}
//                 onChangeText={setSearchQuery}
//                 placeholder="Search for an address..."
//                 placeholderTextColor="#999"
//                 returnKeyType="search"
//                 blurOnSubmit={false}
//                 onFocus={() => setIsSearchFocused(true)}
//                 onBlur={() => setIsSearchFocused(false)}
//               />
//               {searching && (
//                 <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoading} />
//               )}
//               {searchQuery.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     setSearchQuery('');
//                     setSearchResults([]);
//                     setShowSearchResults(false);
//                   }}
//                   style={styles.clearButton}
//                 >
//                   <Ionicons name="close-circle" size={20} color="#999" />
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>

//           {/* Search Results */}
//           {showSearchResults && searchResults.length > 0 && (
//             <View style={styles.searchResultsContainer}>
//               <FlatList
//                 data={searchResults}
//                 renderItem={renderSearchResult}
//                 keyExtractor={(item) => item.place_id}
//                 style={styles.searchResultsList}
//                 keyboardShouldPersistTaps="handled"
//                 showsVerticalScrollIndicator={false}
//                 removeClippedSubviews={false}
//                 maxToRenderPerBatch={10}
//                 windowSize={10}
//               />
//             </View>
//           )}
//         </View>

//         {/* Main Content */}
//         <ScrollView
//           style={styles.scrollView}
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//           keyboardDismissMode="interactive"
//           contentContainerStyle={styles.scrollContent}
//           bounces={false}
//         >
//           {renderMapSection()}
//           {renderAddressInputSection()}
//           {renderSaveButton()}
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // Your existing styles...
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     paddingBottom: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//     backgroundColor: '#fff',
//   },
//   backButton: {
//     padding: 8,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//   },
//   placeholder: {
//     width: 40,
//   },
//   searchSection: {
//     position: 'relative',
//     zIndex: 1000,
//     backgroundColor: '#f8f9fa',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//   },
//   searchContainer: {
//     padding: 16,
//   },
//   searchInputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   searchIcon: {
//     marginRight: 8,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 16,
//     color: '#333',
//     paddingVertical: 4,
//   },
//   searchLoading: {
//     marginLeft: 10,
//   },
//   clearButton: {
//     marginLeft: 8,
//     padding: 4,
//   },
//   searchResultsContainer: {
//     position: 'absolute',
//     top: '100%',
//     left: 16,
//     right: 16,
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 8,
//     zIndex: 1001,
//     maxHeight: 300,
//   },
//   searchResultsList: {
//     maxHeight: 300,
//   },
//   searchResultItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   searchResultText: {
//     marginLeft: 12,
//     flex: 1,
//   },
//   searchResultMain: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#333',
//   },
//   searchResultSecondary: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 2,
//   },
//   mapSection: {
//     marginTop: 16,
//   },
//   mapContainer: {
//     height: Platform.OS === 'web' ? 0 : 250,
//     position: 'relative',
//     marginHorizontal: 16,
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#f5f5f5',
//   },
//   mapLoadingContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   mapLoadingContent: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     flex: 1,
//   },
//   mapLoadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//   },
//   retryLocationButton: {
//     marginTop: 12,
//     paddingHorizontal: 20,
//     paddingVertical: 8,
//     backgroundColor: '#007AFF',
//     borderRadius: 20,
//   },
//   retryLocationText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   map: {
//     flex: 1,
//   },
//   updateMapButton: {
//     position: 'absolute',
//     bottom: 16,
//     right: 16,
//     backgroundColor: '#007AFF',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   updateMapText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 6,
//   },
//   currentLocationButton: {
//     position: 'absolute',
//     bottom: 16,
//     left: 16,
//     backgroundColor: '#fff',
//     padding: 10,
//     borderRadius: 25,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   addressInputSection: {
//     marginTop: 16,
//   },
//   inputContainer: {
//     paddingHorizontal: 16,
//     backgroundColor: '#fff',
//   },
//   inputLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 8,
//   },
//   inputHint: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   addressInput: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     minHeight: 80,
//     textAlignVertical: 'top',
//     backgroundColor: '#f9f9f9',
//   },
//   buttonRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 12,
//   },
//   useCurrentLocationButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 8,
//     flex: 1,
//     marginRight: 8,
//   },
//   useCurrentLocationText: {
//     marginLeft: 8,
//     fontSize: 16,
//     color: '#007AFF',
//     fontWeight: '500',
//   },
//   manualEntryButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 8,
//     flex: 1,
//     marginLeft: 8,
//   },
//   manualEntryText: {
//     marginLeft: 8,
//     fontSize: 16,
//     color: '#666',
//     fontWeight: '500',
//   },
//   saveButtonSection: {
//     marginTop: 24,
//     paddingHorizontal: 16,
//   },
//   saveButton: {
//     backgroundColor: '#007AFF',
//     paddingVertical: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   saveButtonDisabled: {
//     backgroundColor: '#ccc',
//   },
//   saveButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

let MapView: any, Marker: any;
try {
  if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  }
} catch (error) {
  console.log('Maps not available:', error);
  MapView = null;
  Marker = null;
}

import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { searchAddresses, geocodeAddress, reverseGeocode } from '../services/api';
import { API_BASE_URL } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

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
  
  // Map and location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [region, setRegion] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Manual address form states
  const [showManualForm, setShowManualForm] = useState(false);
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
  const [currentTab, setCurrentTab] = useState<'search' | 'manual' | 'saved'>('saved');

  const mapRef = useRef(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved addresses
  const fetchSavedAddresses = useCallback(async () => {
    if (!token) return;
    
    setLoadingSavedAddresses(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const addresses = await response.json();
        setSavedAddresses(addresses);
        
        // Auto-select default address if available
        const defaultAddress = addresses.find((addr: SavedAddress) => addr.is_default);
        if (defaultAddress && !selectedAddress) {
          setSelectedAddress(defaultAddress);
        }
      } else {
        console.error('Failed to fetch saved addresses');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingSavedAddresses(false);
    }
  }, [token, selectedAddress]);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationLoading(false);
        const fallbackLat = 19.0760;
        const fallbackLng = 72.8777;
        setLatitude(fallbackLat);
        setLongitude(fallbackLng);
        setRegion({
          latitude: fallbackLat,
          longitude: fallbackLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      setLatitude(lat);
      setLongitude(lng);
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
    } catch (error) {
      console.error('Error getting location:', error);
      const fallbackLat = 19.0760;
      const fallbackLng = 72.8777;
      setLatitude(fallbackLat);
      setLongitude(fallbackLng);
      setRegion({
        latitude: fallbackLat,
        longitude: fallbackLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Search addresses
  const performAddressSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const data = await searchAddresses(query);
      
      if (data && data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
        setSearchResults(data.predictions);
        setShowSearchResults(true);
      } else {
        const fallbackResults: SearchResult[] = [{
          place_id: 'manual',
          description: query,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Enter this address manually'
          }
        }];
        setSearchResults(fallbackResults);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
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
    
    // Try to get coordinates for the address
    try {
      const data = await geocodeAddress(result.description);
      if (data && data.latitude && data.longitude) {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setRegion({
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }, []);

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

    setLoading(true);
    try {
      const addressData = {
        ...manualAddress,
        latitude: latitude || 0,
        longitude: longitude || 0,
      };

      const response = await fetch(`${API_BASE_URL}/user/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      if (response.ok) {
        const newAddress = await response.json();
        Alert.alert('Success', 'Address saved successfully!');
        
        // Refresh saved addresses
        await fetchSavedAddresses();
        
        // Reset form
        setManualAddress({
          label: 'Home',
          street: '',
          city: '',
          state: '',
          pincode: '',
          landmark: '',
        });
        
        // Switch to saved addresses tab
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

  // Select saved address
  const selectSavedAddress = (address: SavedAddress) => {
    setSelectedAddress(address);
    
    if (isFromCheckout) {
      // Navigate back to checkout with selected address
      const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;
      
      router.back();
      setTimeout(() => {
        router.setParams({
          address: address.street,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          fullAddress: fullAddress,
          latitude: address.latitude?.toString() || '',
          longitude: address.longitude?.toString() || '',
          addressLabel: address.label,
        });
      }, 100);
    }
  };

  useEffect(() => {
    getCurrentLocation();
    fetchSavedAddresses();
  }, []);

  // Search effect
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

  // Render map
  const renderMap = () => {
    if (latitude === null || longitude === null) {
      return (
        <View style={[styles.mapContainer, styles.mapLoadingContainer]}>
          <View style={styles.mapLoadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.mapLoadingText}>Getting your location...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && MapView && (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {Marker && (
              <Marker
                coordinate={{
                  latitude: latitude,
                  longitude: longitude,
                }}
                title="Selected Location"
                draggable
                onDragEnd={async (e: any) => {
                  const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            )}
          </MapView>
        )}
      </View>
    );
  };

  // Render saved addresses
  const renderSavedAddress = ({ item }: { item: SavedAddress }) => (
    <TouchableOpacity
      style={[
        styles.savedAddressCard,
        selectedAddress?._id === item._id && styles.selectedAddressCard
      ]}
      onPress={() => selectSavedAddress(item)}
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
  );

  // Render manual address form
  const renderManualForm = () => (
    <View style={styles.manualFormContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address Label *</Text>
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
        {manualAddress.label === 'Other' && (
          <TextInput
            style={styles.input}
            value={manualAddress.label}
            onChangeText={(text) => setManualAddress(prev => ({ ...prev, label: text }))}
            placeholder="Enter custom label"
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Street Address *</Text>
        <TextInput
          style={styles.input}
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
    </TouchableOpacity>
  );

  // Main render
  return (
    <SafeAreaView style={styles.container}>
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
            Saved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'search' && styles.activeTab]}
          onPress={() => setCurrentTab('search')}
        >
          <Ionicons 
            name="search-outline" 
            size={20} 
            color={currentTab === 'search' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, currentTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'manual' && styles.activeTab]}
          onPress={() => setCurrentTab('manual')}
        >
          <Ionicons 
            name="create-outline" 
            size={20} 
            color={currentTab === 'manual' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, currentTab === 'manual' && styles.activeTabText]}>
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on selected tab */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map section - always visible */}
        <View style={styles.mapSection}>
          {renderMap()}
        </View>

        {/* Tab content */}
        {currentTab === 'saved' && (
          <View style={styles.savedAddressesContainer}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
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
                <Text style={styles.emptyText}>No saved addresses</Text>
                <TouchableOpacity
                  style={styles.addFirstAddressButton}
                  onPress={() => setCurrentTab('manual')}
                >
                  <Text style={styles.addFirstAddressText}>Add Your First Address</Text>
                </TouchableOpacity>
              </View>
            )}

            {isFromCheckout && selectedAddress && (
              <TouchableOpacity 
                style={styles.selectButton}
                onPress={() => selectSavedAddress(selectedAddress)}
              >
                <Text style={styles.selectButtonText}>Use Selected Address</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {currentTab === 'search' && (
          <View style={styles.searchContainer}>
            <Text style={styles.sectionTitle}>Search Address</Text>
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
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.place_id}
                style={styles.searchResultsList}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {currentTab === 'manual' && renderManualForm()}
      </ScrollView>
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
  mapSection: {
    margin: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  savedAddressesContainer: {
    padding: 16,
  },
  savedAddressCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedAddressCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addFirstAddressButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstAddressText: {
    color: '#fff',
    fontSize: 14,
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
  manualFormContainer: {
    padding: 16,
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
});