import React, { useState, useRef } from 'react';
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
  Keyboard,
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

  const cityInputRef = useRef<TextInput>(null);
  const stateInputRef = useRef<TextInput>(null);
  const pincodeInputRef = useRef<TextInput>(null);
  const landmarkInputRef = useRef<TextInput>(null);

  const handleSaveAddress = () => {
    if (!address.street.trim() || !address.city.trim() || !address.pincode.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Street, City, and Pincode)');
      return;
    }

    if (address.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    const fullAddress = [
      address.street,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean).join(', ');

    const addressData: AddressData = {
      address: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      fullAddress: fullAddress,
    };

    // Navigate back with address data
    router.back();
  };

  return (
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
        <Text style={styles.title}>Enter Address Manually</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.scrollContent}
      >
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
              returnKeyType="next"
              onSubmitEditing={() => cityInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              ref={cityInputRef}
              style={styles.input}
              value={address.city}
              onChangeText={(text) => setAddress({ ...address, city: text })}
              placeholder="Enter city name"
              returnKeyType="next"
              onSubmitEditing={() => stateInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              ref={stateInputRef}
              style={styles.input}
              value={address.state}
              onChangeText={(text) => setAddress({ ...address, state: text })}
              placeholder="Enter state name"
              returnKeyType="next"
              onSubmitEditing={() => pincodeInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              ref={pincodeInputRef}
              style={styles.input}
              value={address.pincode}
              onChangeText={(text) => setAddress({ ...address, pincode: text })}
              placeholder="Enter 6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => landmarkInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput
              ref={landmarkInputRef}
              style={styles.input}
              value={address.landmark}
              onChangeText={(text) => setAddress({ ...address, landmark: text })}
              placeholder="Near hospital, school, etc."
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
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
    backgroundColor: '#fff',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    padding: 16,
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
    backgroundColor: '#f9f9f9',
    minHeight: 50,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ManualAddressScreen; 