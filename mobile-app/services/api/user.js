import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';

export const getUserAddress = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.USER_ADDRESS, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserAddress = async (addressData) => {
  try {
    const response = await api.post(API_ENDPOINTS.USER_ADDRESS, addressData, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
