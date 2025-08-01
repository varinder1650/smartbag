import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';
import { withCache } from './cache';

const getBrandsFn = async () => {
  const response = await api.get(API_ENDPOINTS.BRANDS, {
    timeout: 8000,
  });
  return response.data;
};

export const getBrands = withCache('brands', getBrandsFn);
