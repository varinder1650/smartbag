import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';
import { router } from 'expo-router';

interface RequestProductSectionProps {
  onRequestSubmitted?: () => void;
}

export const RequestProductSection: React.FC<RequestProductSectionProps> = ({ onRequestSubmitted }) => {
  const { token, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    category: '',
    description: '',
    estimated_price: '',
    why_needed: '',
  });

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert(
        'Login Required',
        'Please login to request products',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (!formData.product_name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      Alert.alert('Error', 'Please enter a detailed description (minimum 10 characters)');
      return;
    }

    if (!formData.why_needed.trim() || formData.why_needed.trim().length < 10) {
      Alert.alert('Error', 'Please explain why you need this product (minimum 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        product_name: formData.product_name.trim(),
        brand: formData.brand.trim() || null,
        category: formData.category.trim() || null,
        description: formData.description.trim(),
        estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : null,
        why_needed: formData.why_needed.trim(),
      };

      const response = await fetch(`${API_BASE_URL}support/product-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Request Submitted!',
          'Thank you for your product request. We will review it and get back to you soon!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  product_name: '',
                  brand: '',
                  category: '',
                  description: '',
                  estimated_price: '',
                  why_needed: '',
                });
                setShowModal(false);
                onRequestSubmitted?.();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to submit product request');
      }
    } catch (error) {
      console.error('Error submitting product request:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderRequestModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Request Product</Text>
          <View style={styles.modalPlaceholder} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalSubtitle}>
            Can't find what you're looking for? Request it and we'll try to add it to our catalog!
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.product_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, product_name: text }))}
              placeholder="What product do you want?"
              maxLength={200}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(text) => setFormData(prev => ({ ...prev, brand: text }))}
                placeholder="Optional"
                maxLength={100}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
                placeholder="Optional"
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Estimated Price</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_price}
              onChangeText={(text) => setFormData(prev => ({ ...prev, estimated_price: text.replace(/[^0-9.]/g, '') }))}
              placeholder="₹ Optional"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Describe the product in detail..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{formData.description.length}/1000</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Why do you need this product? *</Text>
            <TextInput
              style={styles.textArea}
              value={formData.why_needed}
              onChangeText={(text) => setFormData(prev => ({ ...prev, why_needed: text }))}
              placeholder="Help us understand the demand for this product..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{formData.why_needed.length}/500</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.requestSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
        </View>
        
        <Text style={styles.title}>Can't find what you need?</Text>
        <Text style={styles.subtitle}>
          Request a product and we'll try to add it to our catalog
        </Text>
        
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="send-outline" size={20} color="#fff" />
          <Text style={styles.requestButtonText}>Request Product</Text>
        </TouchableOpacity>
      </View>

      {renderRequestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  requestSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  requestButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalPlaceholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
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
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RequestProductSection;