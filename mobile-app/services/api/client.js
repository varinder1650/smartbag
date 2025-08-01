import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, axiosConfig } from '../../config/apiConfig';

const api = axios.create({
  ...axiosConfig,
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

console.log('🔗 API Base URL (from services/api/client.js):', API_BASE_URL);

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      // Here you might want to trigger a navigation to the login screen
      // This can be done via a navigation service or a state management library
    }
    return Promise.reject(error);
  }
);

export default api;
