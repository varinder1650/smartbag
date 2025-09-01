import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, IMAGE_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

interface OrderItem {
  product: {
    _id: string;
    product_name: string;
    price: number;
    // images: string[];
    // brand: { name: string };
  };
  quantity: number;
  price: number;
}

interface Order {
  _id?: string;
  items?: OrderItem[];
  delivery_address?: {
    address: string;
    city: string;
    state?: string;
    pincode: string;
  };
  payment_method?: string;
  subtotal?: number;
  tax?: number;
  delivery_charge?: number;
  app_fee?: number;
  total_amount?: number;
  order_status?: string;
  payment_status?: string;
  created_at?: string;
}

export default function OrdersScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  // const fetchOrders = async () => {
  //   if (!token) return;
    
  //   try {
  //     const response = await fetch(API_ENDPOINTS.MY_ORDERS, {
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //       },
  //     });
      
  //     if (response.ok) {
  //       const data = await response.json();
  //       setOrders(data || []);
  //       console.log(data)
  //     } else {
  //       console.error('Failed to fetch orders');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching orders:', error);
  //     Alert.alert('Error', 'Failed to load orders');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchOrders = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.MY_ORDERS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data || []);
        
        // Better logging to see the actual data structure
        console.log('Orders count:', data.length);
        if (data.length > 0) {
          console.log('First order ID:', data[0]._id);
          console.log('First order items:', JSON.stringify(data[0].items, null, 2));
          console.log('Product name in first item:', data[0].items[0]?.product_name);
        }
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'confirmed':
        return '#007AFF';
      case 'preparing':
        return '#5856D6';
      case 'out_for_delivery':
        return '#FF2D92';
      case 'delivered':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
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

  // const renderOrderItem = ({ item }: { item: OrderItem }) => (
  //   <View style={styles.orderItemRow}>
  //     <View style={styles.orderItemInfo}>
  //       <Text style={styles.orderItemName} numberOfLines={2}>
  //         {item.product.name}
  //       </Text>
  //       <Text style={styles.orderItemBrand}>{item.product.brand?.name}</Text>
  //       <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
  //     </View>
  //     <Text style={styles.orderItemPrice}>₹{item.price}</Text>
  //   </View>
  // );

  const renderOrder = ({ item }: { item: Order }) => {
    // console.log('Order item data:', item);
    // console.log('Product name:', orderItem.product_name);
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{item._id ? item._id.slice(-8).toUpperCase() : 'N/A'}</Text>
            <Text style={styles.orderDate}>{item.created_at ? formatDate(item.created_at) : 'Date not available'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status || 'pending') }]}>
            <Text style={styles.statusText}>{getStatusText(item.order_status || 'pending')}</Text>
          </View>
        </View>

         <View style={styles.orderItems}>
          {(item.items || []).map((orderItem, index) => (
            <View key={index} style={styles.orderItemRow}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={2}>
                  {orderItem.product_name || 'Product not available'}
                </Text>
                <Text style={styles.orderItemQuantity}>Qty: {orderItem.quantity || 0}</Text>
              </View>
              <Text style={styles.orderItemPrice}>₹{(orderItem.price || 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      
        <View style={styles.orderFooter}>
          <View style={styles.deliveryInfo}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.deliveryAddress} numberOfLines={1}>
              {item.delivery_address ? 
                `${item.delivery_address.address}, ${item.delivery_address.city}` : 
                'Address not available'
              }
            </Text>
          </View>
          
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMethod}>
              {(item.payment_method || 'cod') === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </Text>
            <Text style={styles.totalAmount}>₹{(item.total_amount || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Your order history will appear here
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.shopNowText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id || `order-${Math.random()}`}
          style={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={styles.ordersListContent}
        />
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderItems: {
    padding: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#888',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  orderFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});