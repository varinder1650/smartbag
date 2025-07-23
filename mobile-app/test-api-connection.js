/**
 * Test API Connection
 * 
 * This file helps test the connection to the API server
 */

import { API_BASE_URL, API_ENDPOINTS } from './config/apiConfig';

// Log API configuration
console.log('===== API CONNECTION TEST =====');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('LOGIN endpoint:', API_ENDPOINTS.LOGIN);
console.log('CATEGORIES endpoint:', API_ENDPOINTS.CATEGORIES);

// Test fetch to categories endpoint
const testApiConnection = async () => {
  try {
    console.log('Testing connection to:', API_ENDPOINTS.CATEGORIES);
    const response = await fetch(API_ENDPOINTS.CATEGORIES);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      return { success: true, data };
    } else {
      console.error('API request failed with status:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error('API connection error:', error);
    return { success: false, error: error.message };
  }
};

// Export the test function
export default testApiConnection;