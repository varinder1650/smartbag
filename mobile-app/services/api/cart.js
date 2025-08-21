import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';

export const getCart = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.CART, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_ADD, { 
      productId, // Make sure this matches your backend schema
      quantity 
    }, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fix this function - your backend expects item_id as query parameter
export const removeFromCart = async (itemId) => {
  try {
    const response = await api.delete(`${API_ENDPOINTS.CART_REMOVE}?item_id=${itemId}`, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fix this function - your backend expects itemId and quantity in body
export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await api.put(API_ENDPOINTS.CART_UPDATE, { 
      itemId, // Make sure this matches your backend schema
      quantity 
    }, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};