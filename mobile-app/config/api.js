// API Configuration
export const API_BASE_URL = 'https://smartbag.onrender.com/api/';

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/profile',
  
  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  
  // Categories
  CATEGORIES: '/categories',
  
  // Brands
  BRANDS: '/brands',
  
  // Cart
  CART: '/cart',
  CART_ADD: '/cart/add',
  CART_REMOVE: '/cart/remove',
  CART_UPDATE: '/cart/update',
  
  // Orders
  ORDERS: '/orders',
  ORDER_CREATE: '/orders',
  ORDER_BY_ID: (id) => `/orders/${id}`,
}; 