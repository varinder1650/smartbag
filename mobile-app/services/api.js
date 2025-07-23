import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, axiosConfig } from '../config/apiConfig';

// Create axios instance
const api = axios.create(axiosConfig);

console.log('🔗 API Base URL (from services/api.js):', API_BASE_URL);

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('userToken');
      // You can navigate to login screen here
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = async (credentials) => {
  try {
    // Use API_ENDPOINTS.LOGIN instead of constructing URL manually
    const response = await axios.post(API_ENDPOINTS.LOGIN, credentials, {
      headers: api.defaults.headers
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    // Use API_ENDPOINTS.REGISTER instead of constructing URL manually
    const response = await axios.post(API_ENDPOINTS.REGISTER, userData, {
      headers: api.defaults.headers
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Product APIs
export const getProducts = async (params = {}) => {
  try {
    const response = await api.get(API_ENDPOINTS.PRODUCTS, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProduct = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Category APIs
export const getCategories = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.CATEGORIES);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Brand APIs
export const getBrands = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.BRANDS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cart APIs
export const getCart = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.CART);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_ADD, { productId, quantity });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeFromCart = async (productId) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_REMOVE, { productId });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCartItem = async (productId, quantity) => {
  try {
    const response = await api.post(API_ENDPOINTS.CART_UPDATE, { productId, quantity });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Order APIs
export const getOrders = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.MY_ORDERS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getOrder = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.ORDER_BY_ID(id));
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ORDER_CREATE, orderData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Settings API
export const getSettings = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.SETTINGS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// User Address API
export const getUserAddress = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.USER_ADDRESS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserAddress = async (addressData) => {
  try {
    const response = await api.post(API_ENDPOINTS.USER_ADDRESS, addressData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export the api instance for direct use
export default api;