import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://10.0.0.74:3001/api';

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    brand: { name: string };
  };
  quantity: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function CheckoutScreen() {
  const { token, user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cod');
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Delivery charges and fees
  const DELIVERY_CHARGE = 40;
  const APP_FEE = 10;
  const TAX_RATE = 0.05; // 5% GST

  useEffect(() => {
    fetchCartItems();
    fetchUserData();
  }, []);

  const fetchCartItems = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const cartData = await response.json();
        setCartItems(cartData.items || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    // Use user data from auth context instead of fetching
    if (user) {
      setUserData(user);
      setDeliveryAddress({
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
      });
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getTax = () => {
    return getSubtotal() * TAX_RATE;
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const tax = getTax();
    return subtotal + tax + DELIVERY_CHARGE + APP_FEE;
  };

  const clearCart = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        console.log('Cart cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.address.trim()) {
      Alert.alert('Error', 'Please enter your delivery address');
      return;
    }

    if (!deliveryAddress.city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return;
    }

    if (!deliveryAddress.pincode.trim()) {
      Alert.alert('Error', 'Please enter your pincode');
      return;
    }

    setPlacingOrder(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price,
          })),
          deliveryAddress: {
            address: deliveryAddress.address,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
          },
          paymentMethod: selectedPaymentMethod,
          subtotal: getSubtotal(),
          tax: getTax(),
          deliveryCharge: DELIVERY_CHARGE,
          appFee: APP_FEE,
          totalAmount: getTotal(),
        }),
      });

      if (response.ok) {
        // Clear the cart after successful order
        await clearCart();
        
        Alert.alert(
          'Order Placed Successfully!',
          'Your order has been placed and will be delivered soon.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderAddressSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="location-outline" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>Delivery Address</Text>
      </View>
      
      <View style={styles.addressContainer}>
        <TextInput
          style={styles.addressInput}
          value={deliveryAddress.address}
          onChangeText={(text) => setDeliveryAddress(prev => ({ ...prev, address: text }))}
          placeholder="Enter your delivery address"
          multiline
          numberOfLines={3}
        />
        
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.addressInput, styles.halfWidth]}
            value={deliveryAddress.city}
            onChangeText={(text) => setDeliveryAddress(prev => ({ ...prev, city: text }))}
            placeholder="City"
          />
          <TextInput
            style={[styles.addressInput, styles.halfWidth]}
            value={deliveryAddress.state}
            onChangeText={(text) => setDeliveryAddress(prev => ({ ...prev, state: text }))}
            placeholder="State"
          />
        </View>
        
        <TextInput
          style={styles.addressInput}
          value={deliveryAddress.pincode}
          onChangeText={(text) => setDeliveryAddress(prev => ({ ...prev, pincode: text }))}
          placeholder="Pincode"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="list-outline" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>Order Summary</Text>
      </View>
      
      {cartItems.map((item) => (
        <View key={item._id} style={styles.orderItem}>
          <View style={styles.orderItemInfo}>
            <Text style={styles.orderItemName}>{item.product.name}</Text>
            <Text style={styles.orderItemBrand}>{item.product.brand?.name}</Text>
            <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
          </View>
          <Text style={styles.orderItemPrice}>₹{item.product.price * item.quantity}</Text>
        </View>
      ))}
    </View>
  );

  const renderPriceBreakdown = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calculator-outline" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Subtotal</Text>
        <Text style={styles.priceValue}>₹{getSubtotal()}</Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Tax (5% GST)</Text>
        <Text style={styles.priceValue}>₹{getTax().toFixed(2)}</Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Delivery Charge</Text>
        <Text style={styles.priceValue}>₹{DELIVERY_CHARGE}</Text>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>App Fee</Text>
        <Text style={styles.priceValue}>₹{APP_FEE}</Text>
      </View>
      
      <View style={[styles.priceRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>₹{getTotal().toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderPaymentOptions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card-outline" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPaymentMethod === 'cod' && styles.selectedPaymentOption
        ]}
        onPress={() => setSelectedPaymentMethod('cod')}
      >
        <Ionicons 
          name={selectedPaymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'} 
          size={24} 
          color={selectedPaymentMethod === 'cod' ? '#007AFF' : '#ccc'} 
        />
        <View style={styles.paymentOptionInfo}>
          <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
          <Text style={styles.paymentOptionSubtitle}>Pay when you receive your order</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPaymentMethod === 'online' && styles.selectedPaymentOption
        ]}
        onPress={() => setSelectedPaymentMethod('online')}
      >
        <Ionicons 
          name={selectedPaymentMethod === 'online' ? 'radio-button-on' : 'radio-button-off'} 
          size={24} 
          color={selectedPaymentMethod === 'online' ? '#007AFF' : '#ccc'} 
        />
        <View style={styles.paymentOptionInfo}>
          <Text style={styles.paymentOptionTitle}>Online Payment</Text>
          <Text style={styles.paymentOptionSubtitle}>Pay securely with card or UPI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some products to proceed to checkout
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderAddressSection()}
        {renderOrderSummary()}
        {renderPriceBreakdown()}
        {renderPaymentOptions()}
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, placingOrder && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          )}
          <Text style={styles.placeOrderText}>
            {placingOrder ? 'Placing Order...' : `Place Order - ₹${getTotal().toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  addressContainer: {
    gap: 12,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#888',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPaymentOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentOptionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
}); 