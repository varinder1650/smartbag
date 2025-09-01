import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';

interface SupportCategory {
  value: string;
  label: string;
  description: string;
}

const SUPPORT_CATEGORIES: SupportCategory[] = [
  { value: 'order_inquiry', label: 'Order Inquiry', description: 'Questions about your orders' },
  { value: 'delivery_issue', label: 'Delivery Issue', description: 'Problems with delivery' },
  { value: 'payment_issue', label: 'Payment Issue', description: 'Payment related problems' },
  { value: 'product_feedback', label: 'Product Feedback', description: 'Feedback about products' },
  { value: 'app_feedback', label: 'App Feedback', description: 'Suggestions for the app' },
  { value: 'technical_issue', label: 'Technical Issue', description: 'App bugs or technical problems' },
  { value: 'account_issue', label: 'Account Issue', description: 'Problems with your account' },
  { value: 'other', label: 'Other', description: 'General queries' },
];

export default function HelpSupportScreen() {
  const { token, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Error', 'Please enter a detailed message (minimum 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const ticketData = {
        category: selectedCategory,
        subject: subject.trim(),
        message: message.trim(),
        order_id: orderId.trim() || null,
      };

      const response = await fetch(`${API_BASE_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(ticketData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Your support ticket has been submitted successfully. We will get back to you soon!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setSelectedCategory('');
                setSubject('');
                setMessage('');
                setOrderId('');
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to submit support ticket');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCategorySelector = () => {
    const selectedCategoryData = SUPPORT_CATEGORIES.find(cat => cat.value === selectedCategory);
    
    return (
      <TouchableOpacity
        style={styles.categorySelector}
        onPress={() => setShowCategoryModal(true)}
      >
        <View style={styles.categorySelectorContent}>
          <Text style={styles.categorySelectorLabel}>Category *</Text>
          <Text style={[styles.categorySelectorText, !selectedCategory && styles.placeholder]}>
            {selectedCategoryData ? selectedCategoryData.label : 'Select a category'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Category</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          {SUPPORT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryOption,
                selectedCategory === category.value && styles.selectedCategoryOption
              ]}
              onPress={() => {
                setSelectedCategory(category.value);
                setShowCategoryModal(false);
              }}
            >
              <View style={styles.categoryOptionContent}>
                <Text style={[
                  styles.categoryOptionLabel,
                  selectedCategory === category.value && styles.selectedCategoryText
                ]}>
                  {category.label}
                </Text>
                <Text style={styles.categoryOptionDescription}>
                  {category.description}
                </Text>
              </View>
              {selectedCategory === category.value && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Submit a Support Request</Text>
            <Text style={styles.formSubtitle}>
              Tell us how we can help you. We'll get back to you as soon as possible.
            </Text>

            {/* Category Selector */}
            {renderCategorySelector()}

            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                maxLength={200}
                returnKeyType="next"
              />
            </View>

            {/* Order ID Input (conditional) */}
            {(selectedCategory === 'order_inquiry' || selectedCategory === 'delivery_issue') && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Order ID (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={orderId}
                  onChangeText={setOrderId}
                  placeholder="Enter your order ID if applicable"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={styles.textArea}
                value={message}
                onChangeText={setMessage}
                placeholder="Please describe your issue or question in detail..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{message.length}/2000</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Support Request</Text>
              )}
            </TouchableOpacity>

            {/* Contact Info */}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Other ways to reach us:</Text>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.contactText}>support@smartbag.com</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.contactText}>+91 1234567890</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.contactText}>Mon-Fri, 9 AM - 6 PM</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {renderCategoryModal()}
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
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  categorySelectorContent: {
    flex: 1,
  },
  categorySelectorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
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
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
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
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  modalContent: {
    flex: 1,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCategoryOption: {
    backgroundColor: '#f0f8ff',
  },
  categoryOptionContent: {
    flex: 1,
  },
  categoryOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  selectedCategoryText: {
    color: '#007AFF',
  },
  categoryOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
});