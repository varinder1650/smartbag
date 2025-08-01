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
import { ensureTrailingSlash, removeLeadingSlash, joinApiUrl } from '../utils/apiUtils';

// Debug environment variables
console.log('===== API CONFIG DEBUG =====');
console.log('__DEV__:', __DEV__);
console.log('Constants available:', Constants !== undefined);
console.log('Constants.expoConfig:', Constants.expoConfig);
console.log('Constants.manifest:', Constants.manifest);

// Get the API URL from environment variables - try multiple approaches
let ENV_API_URL: string | undefined;

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

// Define API endpoints interface
interface ApiEndpoints {
  // Auth
  LOGIN: string;
  REGISTER: string;
  PROFILE: string;
  REFRESH_TOKEN: string;
  
  // Products
  PRODUCTS: string;
  PRODUCT_BY_ID: (id: string) => string;

  // Categories
  CATEGORIES: string;

  // Brands
  BRANDS: string;
  
  // Cart
  CART: string;
  CART_ADD: string;
  CART_REMOVE: string;
  CART_UPDATE: string;
  
  // Orders
  ORDERS: string;
  ORDER_CREATE: string;
  ORDER_BY_ID: (id: string) => string;
  MY_ORDERS: string;
  ASSIGN_ORDER: (id: string) => string;
  AVAILABLE_ORDERS: string;
  ASSIGNED_ORDERS: string;
  DELIVERED_ORDERS: string;

  // Settings
  SETTINGS: string;

  // User
  USER_ADDRESS: string;
}

/**
 * Returns the appropriate API base URL based on environment
 * Ensures the URL always ends with a trailing slash
 */
export const getApiBaseUrl = (): string => {
  // First priority: Environment variable
  if (ENV_API_URL) {
    console.log('Using API URL from environment:', ENV_API_URL);
    const url = ensureTrailingSlash(ENV_API_URL);
    console.log('Formatted API URL with trailing slash:', url);
    return url;
  }
  
  // Second priority: Check if in development mode
  if (__DEV__) {
    // Development URLs - try local first, then localhost
    const developmentUrls = [
      'http://localhost:3001/api',
      'http://10.0.0.74:3001/api',
    ];
    
    // Use the first URL (update IP if needed for your local setup)
    const devUrl = ensureTrailingSlash(developmentUrls[0]);
    console.log('Using development API URL:', devUrl);
    return devUrl;
  }
  
  // Production URL
  const productionUrl = ensureTrailingSlash('https://smartbag.onrender.com/api');
  console.log('Using production API URL:', productionUrl);
  return productionUrl;
};

// Export the base URL for direct imports
export const API_BASE_URL: string = getApiBaseUrl();

// Export image base URL (removing /api if present)
export const IMAGE_BASE_URL: string = API_BASE_URL.replace('/api/', '').replace('/api', '');

// Export API endpoints
export const API_ENDPOINTS: ApiEndpoints = {
  // Auth
  LOGIN: joinApiUrl(API_BASE_URL, 'auth/login'),
  REGISTER: joinApiUrl(API_BASE_URL, 'auth/register'),
  PROFILE: joinApiUrl(API_BASE_URL, 'auth/profile'),
  REFRESH_TOKEN: joinApiUrl(API_BASE_URL, 'auth/refresh'),
  
  // Products
  PRODUCTS: joinApiUrl(API_BASE_URL, 'products'),
  PRODUCT_BY_ID: (id: string) => joinApiUrl(API_BASE_URL, `products/${id}`),

  // Categories
  CATEGORIES: joinApiUrl(API_BASE_URL, 'categories'),

  // Brands
  BRANDS: joinApiUrl(API_BASE_URL, 'brands'),
  
  // Cart
  CART: joinApiUrl(API_BASE_URL, 'cart/'),
  CART_ADD: joinApiUrl(API_BASE_URL, 'cart/add'),
  CART_REMOVE: joinApiUrl(API_BASE_URL, 'cart/remove'),
  CART_UPDATE: joinApiUrl(API_BASE_URL, 'cart/update'),
  
  // Orders
  ORDERS: joinApiUrl(API_BASE_URL, 'orders'),
  ORDER_CREATE: joinApiUrl(API_BASE_URL, 'orders'),
  ORDER_BY_ID: (id: string) => joinApiUrl(API_BASE_URL, `orders/${id}`),
  MY_ORDERS: joinApiUrl(API_BASE_URL, 'orders/my'),
  ASSIGN_ORDER: (id: string) => joinApiUrl(API_BASE_URL, `orders/assign/${id}`),
  AVAILABLE_ORDERS: joinApiUrl(API_BASE_URL, 'orders/available-for-assignment'),
  ASSIGNED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/assigned-to-partner'),
  DELIVERED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/delivered-by-partner'),

  // Settings
  SETTINGS: joinApiUrl(API_BASE_URL, 'settings/public'),

  // User
  USER_ADDRESS: joinApiUrl(API_BASE_URL, 'user/address'),
};

// Export for axios configuration
export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
};

console.log('🔗 API Base URL configured as:', API_BASE_URL);
console.log('🔗 Development mode:', __DEV__);

// Force log to terminal during build
if (typeof process !== 'undefined' && process.stdout) {
  process.stdout.write(`\n🔗 TERMINAL LOG: API_BASE_URL = ${API_BASE_URL}\n`);
  process.stdout.write(`🔗 TERMINAL LOG: __DEV__ = ${__DEV__}\n`);
  process.stdout.write(`🔗 TERMINAL LOG: ENV_API_URL = ${ENV_API_URL}\n`);
  process.stdout.write(`🔗 TERMINAL LOG: process.env.EXPO_PUBLIC_API_URL = ${process.env.EXPO_PUBLIC_API_URL}\n\n`);
}
