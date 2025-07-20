import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force use of localhost for development
const getApiUrl = () => {
  // Use computer's IP address for React Native development
  return 'http://10.0.0.74:3001/api';
};

// Create axios instance
const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000, // Increased timeout
});

console.log('🔗 API Base URL:', getApiUrl());

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
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Product APIs
export const getProducts = async (params = {}) => {
  try {
    const response = await api.get('/products', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProduct = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Category APIs
export const getCategories = async () => {
  try {
    const response = await api.get('/categories');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Brand APIs
export const getBrands = async () => {
  try {
    const response = await api.get('/brands');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cart APIs
export const getCart = async () => {
  try {
    const response = await api.get('/cart');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await api.post('/cart/add', { productId, quantity });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCartItem = async (productId, quantity) => {
  try {
    const response = await api.put('/cart/update', { productId, quantity });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeFromCart = async (productId) => {
  try {
    const response = await api.delete(`/cart/remove/${productId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const clearCart = async () => {
  try {
    const response = await api.delete('/cart/clear');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Order APIs
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserOrders = async () => {
  try {
    const response = await api.get('/orders/my');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Address APIs
export const validateAddress = async (address) => {
  try {
    const response = await api.post('/address/validate', { address });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const searchAddresses = async (query) => {
  try {
    const response = await api.get(`/address/search?query=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const geocodeAddress = async (address) => {
  try {
    const formData = new FormData();
    formData.append('address', address);
    const response = await api.post('/address/geocode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await api.post('/address/reverse-geocode', { latitude, longitude });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// User APIs
export const getUserProfile = async () => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await api.put('/user/profile', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api; 