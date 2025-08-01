import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';

export const getOrders = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.MY_ORDERS, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getOrder = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.ORDER_BY_ID(id), {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ORDER_CREATE, orderData, {
      timeout: 15000, // Longer timeout for order creation
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
