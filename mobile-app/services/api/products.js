import { API_ENDPOINTS } from '../../config/apiConfig';
import api from './client';
import { withCache } from './cache';

const getProductsFn = async (params = {}) => {
  const response = await api.get(API_ENDPOINTS.PRODUCTS, { 
    params,
    timeout: 8000,
  });
  return response.data;
};

export const getProducts = withCache(
  (params) => JSON.stringify(params),
  getProductsFn
);

const getProductFn = async (id) => {
  const response = await api.get(API_ENDPOINTS.PRODUCT_BY_ID(id), {
    timeout: 8000,
  });
  return response.data;
};

export const getProduct = withCache(
  (id) => `product_${id}`,
  getProductFn
);
