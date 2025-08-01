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
    const response = await api.post(API_ENDPOINTS.CART_ADD, { productId, quantity }, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeFromCart = async (productId) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_REMOVE, { productId }, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCartItem = async (productId, quantity) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_UPDATE, { productId, quantity }, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
