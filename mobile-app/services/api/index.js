import axios from 'axios';
import { API_BASE_URL } from '../../config/apiConfig';
import { clearCache as clearCacheUtil } from './cache';
import { getCategories } from './categories';
import { getBrands } from './brands';
import { getSettings } from './settings';

export * from './auth';
export * from './products';
export * from './categories';
export * from './brands';
export * from './cart';
export * from './orders';
export * from './settings';
export * from './user';
export * from './geolocation';

export const clearCaches = () => {
  clearCacheUtil();
};

export const preloadData = async () => {
  try {
    await Promise.allSettled([
      getCategories(),
      getBrands(),
      getSettings(),
    ]);
  } catch (error) {
    console.log('Preload failed:', error);
  }
};

export const checkNetworkStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export const batchApiCalls = async (calls) => {
  try {
    const results = await Promise.allSettled(calls);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  } catch (error) {
    console.error('Batch API calls failed:', error);
    throw error;
  }
};

export { default as api } from './client';
