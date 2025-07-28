/**
 * Test script to verify API configuration
 * Run this to check which API URL your app is actually using
 */

import { API_BASE_URL, API_ENDPOINTS } from './config/apiConfig.js';

console.log('=== API Configuration Test ===');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('LOGIN endpoint:', API_ENDPOINTS.LOGIN);
console.log('PRODUCTS endpoint:', API_ENDPOINTS.PRODUCTS);
console.log('Environment variable EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

// Test if the URL is localhost (local development)
if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
  console.log('✅ SUCCESS: App is configured to use LOCAL API');
} else if (API_BASE_URL.includes('smartbag.onrender.com')) {
  console.log('❌ WARNING: App is still using HOSTED API');
} else {
  console.log('⚠️  UNKNOWN: App is using an unexpected API URL');
}

console.log('=== End Test ===');
