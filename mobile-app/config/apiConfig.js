/**
 * Centralized API Configuration
 * 
 * This file provides a single source of truth for API URLs across the application.
 * It uses environment variables for different environments (development, production).
 * 
 * IMPORTANT: All API URLs must end with a trailing slash to prevent redirect issues.
 * All endpoint paths should NOT have a leading slash to prevent double-slash issues.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { ensureTrailingSlash, removeLeadingSlash, joinApiUrl } from '../utils/apiUtils';

// Debug environment variables
console.log('===== API CONFIG DEBUG =====');
console.log('Constants available:', Constants !== undefined);
console.log('Constants.expoConfig:', Constants.expoConfig);
console.log('Constants.manifest:', Constants.manifest); // For older Expo versions

// Get the API URL from environment variables - try multiple approaches
let ENV_API_URL;

// Approach 1: Using Constants.expoConfig?.extra (Expo SDK 46+)
if (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL) {
  ENV_API_URL = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;
  console.log('Found API URL in Constants.expoConfig.extra');
}
// Approach 2: Using Constants.manifest (older Expo versions)
else if (Constants.manifest?.extra?.EXPO_PUBLIC_API_URL) {
  ENV_API_URL = Constants.manifest.extra.EXPO_PUBLIC_API_URL;
  console.log('Found API URL in Constants.manifest.extra');
}
// Approach 3: Direct process.env access
else if (process.env.EXPO_PUBLIC_API_URL) {
  ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
  console.log('Found API URL in process.env');
}

console.log('ENV_API_URL:', ENV_API_URL);

/**
 * Returns the appropriate API base URL based on environment
 * Ensures the URL always ends with a trailing slash
 */
export const getApiBaseUrl = () => {
  // First priority: Environment variable
  if (ENV_API_URL) {
    console.log('Using API URL from environment:', ENV_API_URL);
    const url = ensureTrailingSlash(ENV_API_URL);
    console.log('Formatted API URL with trailing slash:', url);
    return url;
  }
  
  // Second priority: Production URL
  const productionUrl = ensureTrailingSlash('https://smartbag.onrender.com/api');
  
  // For development, you can add fallbacks here if needed
  const developmentUrls = [
    ensureTrailingSlash('http://10.0.0.74:3001/api'),
    ensureTrailingSlash('http://localhost:3001/api'),
  ];
  
  // Hardcoded fallback for safety
  console.log('FALLBACK: Using production API URL:', productionUrl);
  return productionUrl;
};

// Export the base URL for direct imports
export const API_BASE_URL = getApiBaseUrl();

// Export image base URL (removing /api if present)
export const IMAGE_BASE_URL = API_BASE_URL.replace('/api/', '').replace('/api', '');

// Export API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: joinApiUrl(API_BASE_URL, 'auth/login/'),
  REGISTER: joinApiUrl(API_BASE_URL, 'auth/register/'),
  PROFILE: joinApiUrl(API_BASE_URL, 'auth/profile/'),
  
  // Products
  PRODUCTS: joinApiUrl(API_BASE_URL, 'products/'),
  PRODUCT_BY_ID: (id) => joinApiUrl(API_BASE_URL, `products/${id}/`),

  // Categories
  CATEGORIES: joinApiUrl(API_BASE_URL, 'categories/'),

  // Brands
  BRANDS: joinApiUrl(API_BASE_URL, 'brands/'),
  
  // Cart
  CART: joinApiUrl(API_BASE_URL, 'cart/'),
  CART_ADD: joinApiUrl(API_BASE_URL, 'cart/add/'),
  CART_REMOVE: joinApiUrl(API_BASE_URL, 'cart/remove/'),
  CART_UPDATE: joinApiUrl(API_BASE_URL, 'cart/update/'),
  
  // Orders
  ORDERS: joinApiUrl(API_BASE_URL, 'orders'),
  ORDER_CREATE: joinApiUrl(API_BASE_URL, 'orders'),
  ORDER_BY_ID: (id) => joinApiUrl(API_BASE_URL, `orders/${id}`),
  MY_ORDERS: joinApiUrl(API_BASE_URL, 'orders/my'),
  ASSIGN_ORDER: (id) => joinApiUrl(API_BASE_URL, `orders/assign/${id}`),
  AVAILABLE_ORDERS: joinApiUrl(API_BASE_URL, 'orders/available-for-assignment'),
  ASSIGNED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/assigned-to-partner'),
  DELIVERED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/delivered-by-partner'),

  // Settings
  SETTINGS: joinApiUrl(API_BASE_URL, 'settings/public/'),

  // User
  USER_ADDRESS: joinApiUrl(API_BASE_URL, 'user/address/'),
};

// Export for axios configuration
export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
};

console.log('🔗 API Base URL configured as:', API_BASE_URL);