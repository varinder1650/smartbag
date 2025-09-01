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
  FlatList,
  RefreshControl,
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

interface SupportTicket {
  _id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  admin_response?: string;
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
  
  // Tickets list state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Fetch user's support tickets
  const fetchTickets = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}support/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      } else {
        console.error('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'resolved': return '#34C759';
      case 'closed': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryData = SUPPORT_CATEGORIES.find(cat => cat.value === category);
    return categoryData ? categoryData.label : category;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

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

      const response = await fetch(`${API_BASE_URL}support/tickets`, {
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
                setShowCreateForm(false);
                // Refresh tickets to show new one
                fetchTickets();
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

  // NEW: Render individual ticket card
  const renderTicket = ({ item }: { item: SupportTicket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
          <Text style={styles.ticketCategory}>{getCategoryLabel(item.category)}</Text>
          <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.ticketMessage} numberOfLines={2}>
        {item.message}
      </Text>
      
      {item.admin_response && (
        <View style={styles.adminResponse}>
          <Text style={styles.adminResponseLabel}>Admin Response:</Text>
          <Text style={styles.adminResponseText} numberOfLines={2}>
            {item.admin_response}
          </Text>
        </View>
      )}
    </View>
  );

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

  // NEW: Form moved to modal
  const renderCreateForm = () => (
    <Modal
      visible={showCreateForm}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateForm(false)}
    >
      <KeyboardAvoidingView
        style={styles.createFormContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateForm(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Support Ticket</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.formSubtitle}>
            Tell us how we can help you. We'll get back to you as soon as possible.
          </Text>

          {renderCategorySelector()}

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
        </ScrollView>

        {renderCategoryModal()}
      </KeyboardAvoidingView>
    </Modal>
  );

  // MAIN RETURN - NEW STRUCTURE
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tickets List - THIS IS THE NEW MAIN CONTENT */}
      {loadingTickets ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item._id}
          style={styles.ticketsList}
          contentContainerStyle={styles.ticketsListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="help-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Support Tickets</Text>
              <Text style={styles.emptySubtitle}>
                You haven't created any support tickets yet. Tap the + button to create your first ticket.
              </Text>
              
              {/* Contact Info in Empty State */}
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
          }
        />
      )}

      {/* Floating Create Button - THIS IS THE NEW CREATE BUTTON */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateForm(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Form Modal - THIS IS WHERE THE FORM MOVED */}
      {renderCreateForm()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  // NEW: Tickets list styles
  ticketsList: {
    flex: 1,
  },
  ticketsListContent: {
    padding: 16,
    paddingBottom: 100, // Space for floating button
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ticketCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  ticketMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  adminResponse: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  adminResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  adminResponseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  // NEW: Floating create button
  createButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // NEW: Create form modal styles
  createFormContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  modalContent: {
    flex: 1,
    padding: 16,
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
    textAlignVertical: 'top',
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