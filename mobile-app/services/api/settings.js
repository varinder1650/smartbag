import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';
import { withCache } from './cache';

const getSettingsFn = async () => {
  const response = await api.get(API_ENDPOINTS.SETTINGS, {
    timeout: 8000,
  });
  return response.data;
};

export const getSettings = withCache('settings', getSettingsFn);
