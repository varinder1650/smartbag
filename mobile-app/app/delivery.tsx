import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = 'http://10.0.0.74:3001/api';

// Define the Order type
interface Order {
  _id: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
}

const DeliveryScreen = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    // Redirect non-partners to home
    if (user && user.role !== 'partner') {
      router.replace('/(tabs)');
      return;
    }

    if (user?.role === 'partner') {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch all orders relevant to the partner
      const [availableRes, assignedRes, deliveredRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders/available-for-assignment`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/orders/assigned-to-partner`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/orders/delivered-by-partner`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const available = await availableRes.json();
      const assigned = await assignedRes.json();
      const delivered = await deliveredRes.json();
      setAvailableOrders(available.orders || []);
      setAssignedOrders(assigned.orders || []);
      setDeliveredOrders(delivered.orders || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrder = async (orderId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/assign/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Success', 'Order assigned to you!');
        fetchOrders();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to assign order.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign order.');
    } finally {
      setAssigning(false);
    }
  };

  const renderOrder = ({ item }: { item: Order }, showDetails = false) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => setSelectedOrder(item)}
      disabled={showDetails}
    >
      <Text style={styles.orderId}>Order #{item._id}</Text>
      <Text>Status: {item.status}</Text>
      {showDetails && (
        <>
          <Text>Customer: {item.customerName}</Text>
          <Text>Phone: {item.customerPhone}</Text>
          <Text>Address: {item.deliveryAddress}</Text>
        </>
      )}
      {!showDetails && (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => handleAssignOrder(item._id)}
          disabled={assigning}
        >
          <Text style={styles.assignButtonText}>{assigning ? 'Assigning...' : 'Request Assignment'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Show loading if user is not a partner
  if (!user || user.role !== 'partner') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Available Orders</Text>
            {availableOrders.length === 0 && <Text style={styles.emptyText}>No available orders.</Text>}
          </>
        }
        data={availableOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        ListFooterComponent={
          <>
            <Text style={styles.sectionTitle}>Assigned Orders</Text>
            {assignedOrders.length === 0 && <Text style={styles.emptyText}>No assigned orders.</Text>}
            <FlatList
              data={assignedOrders}
              renderItem={(item) => renderOrder(item, true)}
              keyExtractor={(item) => item._id}
              ListFooterComponent={
                <>
                  <Text style={styles.sectionTitle}>Delivered Orders</Text>
                  {deliveredOrders.length === 0 && <Text style={styles.emptyText}>No delivered orders.</Text>}
                  <FlatList
                    data={deliveredOrders}
                    renderItem={(item) => renderOrder(item, true)}
                    keyExtractor={(item) => item._id}
                  />
                </>
              }
            />
          </>
        }
      />
      {selectedOrder && (
        <View style={styles.orderDetailsModal}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <Text>Order ID: {selectedOrder._id}</Text>
          <Text>Status: {selectedOrder.status}</Text>
          <Text>Customer: {selectedOrder.customerName}</Text>
          <Text>Phone: {selectedOrder.customerPhone}</Text>
          <Text>Address: {selectedOrder.deliveryAddress}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedOrder(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 12 },
  orderCard: { backgroundColor: '#f0f4f8', borderRadius: 8, padding: 16, marginBottom: 12 },
  orderId: { fontWeight: 'bold', marginBottom: 4 },
  assignButton: { marginTop: 8, backgroundColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center' },
  assignButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontStyle: 'italic', marginBottom: 8 },
  orderDetailsModal: { position: 'absolute', top: 40, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8, zIndex: 10 },
  closeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#007AFF', borderRadius: 16, padding: 4 },
});

export default DeliveryScreen; 