import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface AddressData {
  address: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
}

const ManualAddressScreen = () => {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  const handleSaveAddress = () => {
    // Validate required fields
    if (!address.street || !address.city || !address.pincode) {
      Alert.alert('Error', 'Please fill in all required fields (Street, City, Pincode)');
      return;
    }

    // Validate pincode format (6 digits for India)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(address.pincode)) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    const addressData: AddressData = {
      address: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      fullAddress: `${address.street}, ${address.city}, ${address.state} ${address.pincode}`.trim(),
    };

    // Pass the address data back to the previous screen
    router.back();
    
    // You can also store this in global state or pass it through navigation params
    // For now, we'll use a simple approach and let the user know
    Alert.alert(
      'Address Saved',
      `Delivery address: ${addressData.fullAddress}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Enter Address Manually</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(text) => setAddress({ ...address, street: text })}
              placeholder="Enter street address"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={address.city}
              onChangeText={(text) => setAddress({ ...address, city: text })}
              placeholder="Enter city name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={address.state}
              onChangeText={(text) => setAddress({ ...address, state: text })}
              placeholder="Enter state name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={styles.input}
              value={address.pincode}
              onChangeText={(text) => setAddress({ ...address, pincode: text })}
              placeholder="Enter 6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              value={address.landmark}
              onChangeText={(text) => setAddress({ ...address, landmark: text })}
              placeholder="Near hospital, school, etc."
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Address</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ManualAddressScreen; 