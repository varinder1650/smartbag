// import Constants from 'expo-constants';
// import { ensureTrailingSlash, joinApiUrl } from '../utils/apiUtils';

// // Get the API URL from environment variables
// const ENV_API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

// /**
//  * Returns the appropriate API base URL based on environment
//  * Ensures the URL always ends with a trailing slash
//  */
// export const getApiBaseUrl = (): string => {
//   // Production: Use environment variable
//   if (ENV_API_URL) {
//     console.log(`Using API URL from .env file: ${ENV_API_URL}`);
//     return ensureTrailingSlash(ENV_API_URL);
//   }

//   // Development: Use hardcoded IP address to bypass caching issues
//   if (__DEV__) {
//     const hardcodedUrl = 'http://10.0.2.2:8000/api';
//     console.warn(`⚠️  EXPO_PUBLIC_API_URL not set. Using hardcoded development URL: ${hardcodedUrl}`);
//     return hardcodedUrl;
//   }

//   // Fallback error URL
//   throw new Error('API_BASE_URL not configured. Please set EXPO_PUBLIC_API_URL in your .env file or check the hardcoded URL in apiConfig.ts.');
// };

// // Export the base URL
// export const API_BASE_URL: string = getApiBaseUrl();

// // Export image base URL (removing /api if present)
// export const IMAGE_BASE_URL: string = API_BASE_URL.replace('/api/', '').replace('/api', '');

// // API endpoints interface with better typing
// interface ApiEndpoints {
//   // Auth
//   LOGIN: string;
//   REGISTER: string;
//   PROFILE: string;
//   REFRESH_TOKEN: string;

//   // Products
//   PRODUCTS: string;
//   PRODUCT_BY_ID: (id: string) => string;

//   // Categories
//   CATEGORIES: string;

//   // Brands
//   BRANDS: string;

//   // Cart
//   CART: string;
//   CART_ADD: string;
//   CART_REMOVE: string;
//   CART_UPDATE: string;

//   // Orders
//   ORDERS: string;
//   ORDER_BY_ID: (id: string) => string;
//   MY_ORDERS: string;
//   ASSIGN_ORDER: (id: string) => string;
//   AVAILABLE_ORDERS: string;
//   ASSIGNED_ORDERS: string;
//   DELIVERED_ORDERS: string;

//   // Settings
//   SETTINGS: string;

//   // User & Address
//   USER_ADDRESS: string;
//   SEARCH_ADDRESSES: string;
//   GEOCODE: string;
//   REVERSE_GEOCODE: string;
//   ADDRESS_HEALTH: string;

//   // Health check
//   HEALTH: string;
// }

// // Export API endpoints
// export const API_ENDPOINTS: ApiEndpoints = {
//   // Auth
//   LOGIN: joinApiUrl(API_BASE_URL, 'auth/login'),
//   REGISTER: joinApiUrl(API_BASE_URL, 'auth/register'),
//   PROFILE: joinApiUrl(API_BASE_URL, 'auth/profile'),
//   REFRESH_TOKEN: joinApiUrl(API_BASE_URL, 'auth/refresh'),
 
//   // Products - Fixed the template literal issue
//   PRODUCTS: joinApiUrl(API_BASE_URL, 'products'),
//   PRODUCT_BY_ID: (id: string) => joinApiUrl(API_BASE_URL, `products/${id}`),

//   // Categories
//   CATEGORIES: joinApiUrl(API_BASE_URL, 'categories'),

//   // Brands
//   BRANDS: joinApiUrl(API_BASE_URL, 'brands'),

//   // Cart
//   CART: joinApiUrl(API_BASE_URL, 'cart/'),
//   CART_ADD: joinApiUrl(API_BASE_URL, 'cart/add'),
//   CART_REMOVE: joinApiUrl(API_BASE_URL, 'cart/remove'),
//   CART_UPDATE: joinApiUrl(API_BASE_URL, 'cart/update'),

//   // Orders
//   ORDERS: joinApiUrl(API_BASE_URL, 'orders/'),
//   ORDER_BY_ID: (id: string) => joinApiUrl(API_BASE_URL, `orders/${id}`),
//   MY_ORDERS: joinApiUrl(API_BASE_URL, 'orders/my'),
//   ASSIGN_ORDER: (id: string) => joinApiUrl(API_BASE_URL, `orders/assign/${id}`),
//   AVAILABLE_ORDERS: joinApiUrl(API_BASE_URL, 'orders/available-for-assignment'),
//   ASSIGNED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/assigned-to-partner'),
//   DELIVERED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/delivered-by-partner'),

//   // Settings
//   SETTINGS: joinApiUrl(API_BASE_URL, 'settings/public'),

//   // User & Address Services - Fixed the paths
//   USER_ADDRESS: joinApiUrl(API_BASE_URL, 'user/address'),
//   SEARCH_ADDRESSES: joinApiUrl(API_BASE_URL, 'search-addresses'),
//   GEOCODE: joinApiUrl(API_BASE_URL, 'geocode'), 
//   REVERSE_GEOCODE: joinApiUrl(API_BASE_URL, 'reverse-geocode'),
//   ADDRESS_HEALTH: joinApiUrl(API_BASE_URL, 'health'),

//   // Health check
//   HEALTH: joinApiUrl(API_BASE_URL, 'health'),
// };

// // Export axios configuration for consistency
// export const API_REQUEST_TIMEOUT = 15000; // 15 seconds

// export const axiosConfig = {
//   baseURL: API_BASE_URL,
//   timeout: API_REQUEST_TIMEOUT,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// };

// /**
//  * Creates a full API URL and logs it for debugging.
//  * @param endpoint - The API endpoint (e.g., 'auth/login').
//  * @returns The full, resolved API URL.
//  */
// export const createApiUrl = (endpoint: string): string => {
//   const url = joinApiUrl(API_BASE_URL, endpoint);
//   console.log(`Constructed API URL: ${url}`);
//   return url;
// };

// import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// // Utility function to test API connectivity
// export const testApiConnection = async (): Promise<boolean> => {
//   try {
//     const response = await fetchWithTimeout(
//       API_ENDPOINTS.HEALTH,
//       {
//         method: 'GET',
//       },
//       5000
//     );
//     return response.ok;
//   } catch (error) {
//     console.error('API connection test failed:', error);
//     return false;
//   }
// };

import Constants from 'expo-constants';
import { ensureTrailingSlash, joinApiUrl } from '../utils/apiUtils';

// Get the API URL from environment variables
const ENV_API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

/**
 * Returns the appropriate API base URL based on environment
 * Ensures the URL always ends with a trailing slash
 */
export const getApiBaseUrl = (): string => {
  // Production: Use environment variable
  if (ENV_API_URL) {
    console.log(`Using API URL from .env file: ${ENV_API_URL}`);
    return ensureTrailingSlash(ENV_API_URL);
  }

  // Development: Use hardcoded IP address to bypass caching issues
  if (__DEV__) {
    const hardcodedUrl = 'http://10.0.2.2:8000/api';
    console.warn(`⚠️  EXPO_PUBLIC_API_URL not set. Using hardcoded development URL: ${hardcodedUrl}`);
    return hardcodedUrl;
  }

  // Fallback error URL
  throw new Error('API_BASE_URL not configured. Please set EXPO_PUBLIC_API_URL in your .env file or check the hardcoded URL in apiConfig.ts.');
};

// Export the base URL
export const API_BASE_URL: string = getApiBaseUrl();

// Export image base URL (removing /api if present)
export const IMAGE_BASE_URL: string = API_BASE_URL.replace('/api/', '').replace('/api', '');

// API endpoints interface with better typing
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
  ORDER_BY_ID: (id: string) => string;
  MY_ORDERS: string;
  ASSIGN_ORDER: (id: string) => string;
  AVAILABLE_ORDERS: string;
  ASSIGNED_ORDERS: string;
  DELIVERED_ORDERS: string;

  // Settings
  SETTINGS: string;

  // User & Address
  USER_ADDRESS: string;
  SEARCH_ADDRESSES: string;
  GEOCODE: string;
  REVERSE_GEOCODE: string;
  ADDRESS_HEALTH: string;

  // Health check
  HEALTH: string;
}

// Export API endpoints
export const API_ENDPOINTS: ApiEndpoints = {
  // Auth
  LOGIN: joinApiUrl(API_BASE_URL, 'auth/login'),
  REGISTER: joinApiUrl(API_BASE_URL, 'auth/register'),
  PROFILE: joinApiUrl(API_BASE_URL, 'auth/profile'),
  REFRESH_TOKEN: joinApiUrl(API_BASE_URL, 'auth/refresh'),
 
  // Products - Fixed the template literal issue
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
  ORDERS: joinApiUrl(API_BASE_URL, 'orders/'),
  ORDER_BY_ID: (id: string) => joinApiUrl(API_BASE_URL, `orders/${id}`),
  MY_ORDERS: joinApiUrl(API_BASE_URL, 'orders/my'),
  ASSIGN_ORDER: (id: string) => joinApiUrl(API_BASE_URL, `orders/assign/${id}`),
  AVAILABLE_ORDERS: joinApiUrl(API_BASE_URL, 'orders/available-for-assignment'),
  ASSIGNED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/assigned-to-partner'),
  DELIVERED_ORDERS: joinApiUrl(API_BASE_URL, 'orders/delivered-by-partner'),

  // Settings
  SETTINGS: joinApiUrl(API_BASE_URL, 'settings/public'),

  // User & Address Services - Fixed the paths
  USER_ADDRESS: joinApiUrl(API_BASE_URL, 'user/address'),
  SEARCH_ADDRESSES: joinApiUrl(API_BASE_URL, 'search-addresses'),
  GEOCODE: joinApiUrl(API_BASE_URL, 'geocode'), 
  REVERSE_GEOCODE: joinApiUrl(API_BASE_URL, 'reverse-geocode'),
  ADDRESS_HEALTH: joinApiUrl(API_BASE_URL, 'health'),

  // Health check
  HEALTH: joinApiUrl(API_BASE_URL, 'health'),
};

// Export axios configuration for consistency
export const API_REQUEST_TIMEOUT = 15000; // 15 seconds

export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: API_REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Creates a full API URL and logs it for debugging.
 * @param endpoint - The API endpoint (e.g., 'auth/login').
 * @returns The full, resolved API URL.
 */
export const createApiUrl = (endpoint: string): string => {
  const url = joinApiUrl(API_BASE_URL, endpoint);
  console.log(`Constructed API URL: ${url}`);
  return url;
};

import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// Utility function to test API connectivity
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.HEALTH,
      {
        method: 'GET',
      },
      5000
    );
    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};