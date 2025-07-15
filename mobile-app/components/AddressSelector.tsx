import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AddressMapPicker from './AddressMapPicker';

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

interface AddressSelectorProps {
  onAddressSelect: (address: AddressData) => void;
  currentAddress?: AddressData;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ 
  onAddressSelect, 
  currentAddress 
}) => {
  const [showMap, setShowMap] = useState(false);

  const handleMapAddressSelect = (addressData: AddressData) => {
    onAddressSelect(addressData);
    setShowMap(false);
  };

  const handleManualAddress = () => {
    // Navigate to manual address input
    router.push('/manual-address');
  };

  const handleSearchAddress = () => {
    // Navigate to enhanced address screen with search
    router.push('/address?from=checkout');
  };

  const handleUseCurrentLocation = () => {
    setShowMap(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location-outline" size={24} color="#007AFF" />
        <Text style={styles.title}>Delivery Address</Text>
      </View>

      {currentAddress ? (
        <View style={styles.currentAddressContainer}>
          <View style={styles.addressCard}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <View style={styles.addressDetails}>
              <Text style={styles.addressText}>{currentAddress.fullAddress}</Text>
              {currentAddress.coordinates && (
                <Text style={styles.coordinatesText}>
                  Lat: {currentAddress.coordinates.latitude.toFixed(6)}, 
                  Lng: {currentAddress.coordinates.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.changeAddressButton}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.changeAddressText}>Change Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleSearchAddress}
          >
            <Ionicons name="search" size={24} color="#007AFF" />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Search Address</Text>
              <Text style={styles.optionSubtitle}>Search and select your delivery address</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleUseCurrentLocation}
          >
            <Ionicons name="map" size={24} color="#007AFF" />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Use Map to Select Location</Text>
              <Text style={styles.optionSubtitle}>Tap on map to choose your delivery address</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleManualAddress}
          >
            <Ionicons name="create" size={24} color="#007AFF" />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Enter Address Manually</Text>
              <Text style={styles.optionSubtitle}>Type your address details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Map Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              onPress={() => setShowMap(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Delivery Location</Text>
          </View>
          
          <AddressMapPicker onAddressSelect={handleMapAddressSelect} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  currentAddressContainer: {
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  addressDetails: {
    flex: 1,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  changeAddressText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default AddressSelector; 