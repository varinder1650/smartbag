import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';
import { withCache } from './cache';

const getCategoriesFn = async () => {
  const response = await api.get(API_ENDPOINTS.CATEGORIES, {
    timeout: 8000,
  });
  return response.data;
};

export const getCategories = withCache('categories', getCategoriesFn);
