// API Configuration
export const API_CONFIG = {
  // Use your computer's IP address when testing on physical device
  // Use localhost when testing on web or simulator
  BASE_URL: __DEV__ ? 'http://10.0.0.74:3001/api' : 'http://localhost:3001/api',
  
  // Alternative configurations to try if IP doesn't work
  ALTERNATIVE_URLS: [
    'http://10.0.0.74:3001/api',
    'http://Nitins-MacBook-Air.local:3001/api',
    'http://localhost:3001/api'
  ],
  
  // Environment variable for API URL (for production)
  ENV_URL: process.env.EXPO_PUBLIC_API_URL,
  
  // Ola Krutrim Maps API configuration
  KRUTRIM_MAPS: {
    API_KEY: process.env.EXPO_PUBLIC_OLA_KRUTRIM_API_KEY,
    BASE_URL: 'https://api.krutrim.ai/v1/maps'
  }
};

export const API_ENDPOINTS = {
  HEALTH: `${API_CONFIG.BASE_URL}/health`,
  PRODUCTS: `${API_CONFIG.BASE_URL}/products`,
  CATEGORIES: `${API_CONFIG.BASE_URL}/categories`,
  BRANDS: `${API_CONFIG.BASE_URL}/brands`,
  CART: `${API_CONFIG.BASE_URL}/cart`,
  ORDERS: `${API_CONFIG.BASE_URL}/orders`,
  AUTH: {
    LOGIN: `${API_CONFIG.BASE_URL}/auth/login`,
    REGISTER: `${API_CONFIG.BASE_URL}/auth/register`,
    USERS: `${API_CONFIG.BASE_URL}/auth/users`,
  },
}; 