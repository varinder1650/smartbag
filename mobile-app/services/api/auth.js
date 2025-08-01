import axios from 'axios';
import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';

export const login = async (credentials) => {
  try {
    const response = await axios.post(API_ENDPOINTS.LOGIN, credentials, {
      headers: api.defaults.headers,
      timeout: 15000, // Longer timeout for login
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await axios.post(API_ENDPOINTS.REGISTER, userData, {
      headers: api.defaults.headers,
      timeout: 15000, // Longer timeout for registration
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
