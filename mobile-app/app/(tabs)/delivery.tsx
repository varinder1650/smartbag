import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../config/apiConfig';

interface Order {
  _id: string;
  order_status: string;
  total_amount: number;
  created_at: string;
  user_info?: {
    name: string;
    phone: string;
    email: string;
  };
  delivery_address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items?: any[];
}

type TabType = 'available' | 'assigned' | 'delivered';

export default function DeliveryScreen() {
  console.log('DeliveryScreen component loaded');
  
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('available');
  
  // Separate state for each tab
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAvailableOrders = async () => {
    if (!token) return [];
    
    try {
      console.log('Fetching available orders...');
      const response = await fetch(`${API_BASE_URL}delivery/available`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Only delivery partners can access this.');
        }
        throw new Error(`Failed to fetch available orders: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Available orders fetched:', data.length);
      return data;
    } catch (error) {
      console.error('Error fetching available orders:', error);
      throw error;
    }
  };

  const fetchAssignedOrders = async () => {
    if (!token) return [];
    
    try {
      console.log('Fetching assigned orders...');
      const response = await fetch(`${API_BASE_URL}delivery/assigned`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Only delivery partners can access this.');
        }
        throw new Error(`Failed to fetch assigned orders: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Assigned orders fetched:', data.length);
      return data;
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      throw error;
    }
  };

  const fetchDeliveredOrders = async () => {
    if (!token) return [];
    
    try {
      console.log('Fetching delivered orders...');
      const response = await fetch(`${API_BASE_URL}delivery/delivered`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Only delivery partners can access this.');
        }
        throw new Error(`Failed to fetch delivered orders: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Delivered orders fetched:', data.length);
      return data;
    } catch (error) {
      console.error('Error fetching delivered orders:', error);
      throw error;
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    console.log('Fetching delivery orders...');
    
    try {
      // Fetch all three types of orders in parallel
      const [available, assigned, delivered] = await Promise.all([
        fetchAvailableOrders(),
        fetchAssignedOrders(),
        fetchDeliveredOrders()
      ]);

      setAvailableOrders(available);
      setAssignedOrders(assigned);
      setDeliveredOrders(delivered);

      console.log('All orders loaded successfully');

    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', `Failed to fetch orders: ${error.message || 'Please check your connection.'}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    console.log('DeliveryScreen useEffect - User role:', user?.role);
    
    if (user && user.role !== 'delivery_partner') {
      Alert.alert(
        'Access Denied',
        'This section is only for delivery partners.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
      return;
    }

    if (user?.role === 'delivery_partner') {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActionLoading(true);
            try {
              console.log('Accepting order:', orderId);
              
              const response = await fetch(`${API_BASE_URL}delivery/${orderId}/accept`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to accept order');
              }

              const data = await response.json();
              console.log('Order accepted:', data);
              
              Alert.alert('Success', 'Order assigned to you!');
              
              // Refresh orders to update the lists
              await fetchOrders();
              setCurrentTab('assigned');
              
            } catch (error) {
              console.error('Error accepting order:', error);
              Alert.alert('Error', `Failed to accept order: ${error.message || 'Please try again.'}`);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    Alert.alert(
      'Mark as Delivered',
      'Confirm that this order has been delivered to the customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              console.log('Marking order as delivered:', orderId);
              
              const response = await fetch(`${API_BASE_URL}delivery/${orderId}/mark-delivered`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to mark order as delivered');
              }

              const data = await response.json();
              console.log('Order marked as delivered:', data);
              
              Alert.alert('Success', 'Order marked as delivered!');
              
              // Refresh orders to update the lists
              await fetchOrders();
              setIsModalVisible(false);
              setCurrentTab('delivered');
              
            } catch (error) {
              console.error('Error marking as delivered:', error);
              Alert.alert('Error', `Failed to update order status: ${error.message || 'Please try again.'}`);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#007AFF';
      case 'assigned': return '#5856D6';
      case 'out_for_delivery': return '#FF2D92';
      case 'delivered': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getCurrentTabData = (): Order[] => {
    switch (currentTab) {
      case 'available': return availableOrders;
      case 'assigned': return assignedOrders;
      case 'delivered': return deliveredOrders;
      default: return [];
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => openOrderDetails(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) }]}>
          <Text style={styles.statusText}>{item.order_status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.customerName}>
          Customer: {item.user_info?.name || 'N/A'}
        </Text>
        <Text style={styles.deliveryAddress} numberOfLines={2}>
          Address: {item.delivery_address ? 
            `${item.delivery_address.address}, ${item.delivery_address.city}` : 
            'Address not available'
          }
        </Text>
        <Text style={styles.orderAmount}>
          Amount: ₹{item.total_amount || 0}
        </Text>
      </View>

      {currentTab === 'available' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={(e) => {
            e.stopPropagation();
            handleAcceptOrder(item._id);
          }}
          disabled={actionLoading}
        >
          <Text style={styles.acceptButtonText}>
            {actionLoading ? 'Accepting...' : 'Accept Delivery'}
          </Text>
        </TouchableOpacity>
      )}

      {currentTab === 'assigned' && (
        <TouchableOpacity
          style={styles.deliveredButton}
          onPress={(e) => {
            e.stopPropagation();
            handleMarkAsDelivered(item._id);
          }}
          disabled={actionLoading}
        >
          <Text style={styles.deliveredButtonText}>
            {actionLoading ? 'Updating...' : 'Mark as Delivered'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    const tabData = getCurrentTabData();
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={tabData}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        style={styles.ordersList}
        contentContainerStyle={styles.ordersListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={currentTab === 'available' ? 'storefront-outline' : 
                   currentTab === 'assigned' ? 'bicycle-outline' : 'checkmark-circle-outline'} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyTitle}>
              {currentTab === 'available' ? 'No Available Orders' :
               currentTab === 'assigned' ? 'No Assigned Orders' : 'No Delivered Orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {currentTab === 'available' ? 'Check back later for new delivery opportunities' :
               currentTab === 'assigned' ? 'You have no orders assigned for delivery' : 
               'You haven\'t delivered any orders yet'}
            </Text>
          </View>
        }
      />
    );
  };

  console.log('Rendering DeliveryScreen component');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading || refreshing}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={loading || refreshing ? "#ccc" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'available' && styles.activeTab]}
          onPress={() => setCurrentTab('available')}
        >
          <Ionicons 
            name="storefront-outline" 
            size={20} 
            color={currentTab === 'available' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, currentTab === 'available' && styles.activeTabText]}>
            Available
          </Text>
          {availableOrders.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{availableOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'assigned' && styles.activeTab]}
          onPress={() => setCurrentTab('assigned')}
        >
          <Ionicons 
            name="bicycle-outline" 
            size={20} 
            color={currentTab === 'assigned' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, currentTab === 'assigned' && styles.activeTabText]}>
            Assigned
          </Text>
          {assignedOrders.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{assignedOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'delivered' && styles.activeTab]}
          onPress={() => setCurrentTab('delivered')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={20} 
            color={currentTab === 'delivered' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, currentTab === 'delivered' && styles.activeTabText]}>
            Delivered
          </Text>
          {deliveredOrders.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{deliveredOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Order Details</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>#{selectedOrder._id.slice(-8).toUpperCase()}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.order_status) }]}>
                  <Text style={styles.statusText}>{selectedOrder.order_status}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Customer Details</Text>
                <Text style={styles.detailValue}>
                  Name: {selectedOrder.user_info?.name || 'N/A'}
                </Text>
                <Text style={styles.detailValue}>
                  Phone: {selectedOrder.user_info?.phone || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Delivery Address</Text>
                <Text style={styles.detailValue}>
                  {selectedOrder.delivery_address ? 
                    `${selectedOrder.delivery_address.address}, ${selectedOrder.delivery_address.city}, ${selectedOrder.delivery_address.state}, ${selectedOrder.delivery_address.pincode}` : 
                    'Address not available'
                  }
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order Amount</Text>
                <Text style={styles.detailValue}>₹{selectedOrder.total_amount || 0}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                {currentTab === 'available' && (
                  <TouchableOpacity
                    style={styles.modalAcceptButton}
                    onPress={() => {
                      setIsModalVisible(false);
                      handleAcceptOrder(selectedOrder._id);
                    }}
                    disabled={actionLoading}
                  >
                    <Text style={styles.modalAcceptButtonText}>
                      {actionLoading ? 'Accepting...' : 'Accept This Order'}
                    </Text>
                  </TouchableOpacity>
                )}

                {currentTab === 'assigned' && (
                  <TouchableOpacity
                    style={styles.modalDeliveredButton}
                    onPress={() => handleMarkAsDelivered(selectedOrder._id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.modalDeliveredButtonText}>
                      {actionLoading ? 'Updating...' : 'Mark as Delivered'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    position: 'relative',
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
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveredButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  placeholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  modalActions: {
    marginTop: 20,
  },
  modalAcceptButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAcceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeliveredButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDeliveredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});