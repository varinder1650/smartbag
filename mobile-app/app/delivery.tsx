import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert, Modal, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_ENDPOINTS } from '../config/apiConfig';

// Define the Order type
interface Order {
  _id: string;
  order_status: string;
  user_info?: {
    name: string;
    phone: string;
  };
  delivery_address?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
}

interface OrderSection {
  title: string;
  data: Order[];
}

const DeliveryScreen = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSection[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [availableRes, assignedRes, deliveredRes] = await Promise.all([
        fetch(API_ENDPOINTS.AVAILABLE_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(API_ENDPOINTS.ASSIGNED_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(API_ENDPOINTS.DELIVERED_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const available = await availableRes.json();
      const assigned = await assignedRes.json();
      const delivered = await deliveredRes.json();

      console.log("Assigned Orders from API:", assigned);

      const sections = [
        { title: 'Upcoming Orders', data: available || [] },
        { title: 'Assigned to you', data: assigned || [] },
        { title: 'Previously Delivered', data: delivered || [] },
      ];

      setOrders(sections);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && user.role !== 'delivery_partner') {
      router.replace('/(tabs)');
      return;
    }

    if (user?.role === 'delivery_partner') {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.ASSIGN_ORDER(orderId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Success', 'Order assigned to you!');
        fetchOrders();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to accept order.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.ORDERS}${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'delivered' }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Order marked as delivered!');
        fetchOrders();
        setIsModalVisible(false);
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to update order status.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  const renderOrder = ({ item, section }: { item: Order, section: OrderSection }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => openOrderDetails(item)}
    >
      <Text style={styles.orderId}>Order #{item._id}</Text>
      <Text>Status: {item.order_status}</Text>
      {section.title === 'Upcoming Orders' && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAcceptOrder(item._id)}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>{actionLoading ? 'Accepting...' : 'Accept Order'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        extraData={loading}
        renderSectionHeader={({ section: { title, data } }) => (
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {data.length === 0 && <Text style={styles.emptyText}>No orders in this category.</Text>}
          </View>
        )}
        onRefresh={fetchOrders}
        refreshing={loading}
      />
      {selectedOrder && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <Text style={styles.modalText}>Order ID: {selectedOrder._id}</Text>
              <Text style={styles.modalText}>Status: {selectedOrder.order_status}</Text>
              <Text style={styles.modalText}>Customer: {selectedOrder.user_info?.name || 'N/A'}</Text>
              <Text style={styles.modalText}>Phone: {selectedOrder.user_info?.phone || 'N/A'}</Text>
              <Text style={styles.modalText}>Address: {selectedOrder.delivery_address ? `${selectedOrder.delivery_address.street}, ${selectedOrder.delivery_address.city}` : 'N/A'}</Text>
              
              {selectedOrder.order_status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: 20 }]}
                  onPress={() => handleMarkAsDelivered(selectedOrder._id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionButtonText}>{actionLoading ? 'Updating...' : 'Mark as Delivered'}</Text>
                </TouchableOpacity>
              )}

              <Button title="Close" onPress={() => setIsModalVisible(false)} />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, backgroundColor: '#f0f4f8', padding: 8, borderRadius: 6 },
  orderCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 16, marginBottom: 12 },
  orderId: { fontWeight: 'bold', marginBottom: 4 },
  actionButton: { marginTop: 12, backgroundColor: '#007AFF', padding: 12, borderRadius: 6, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontStyle: 'italic', marginBottom: 8, paddingHorizontal: 8 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalText: { fontSize: 16, marginBottom: 8 },
});

export default DeliveryScreen;
