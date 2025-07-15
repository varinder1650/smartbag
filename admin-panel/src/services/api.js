import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      const delay = Math.pow(2, originalRequest._retryCount || 0) * 1000;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      console.warn(`Rate limit exceeded, retrying in ${delay}ms...`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api.request(originalRequest));
        }, delay);
      });
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  getUsers: () => api.get('/auth/users'),

  // Products
  getProducts: (params = {}) => {
    const timestamp = Date.now();
    return api.get(`/products?_t=${timestamp}`, { params });
  },
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),

  // Categories
  getCategories: (params = {}) => {
    const timestamp = Date.now();
    return api.get(`/categories?_t=${timestamp}`, { params });
  },
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),

  // Brands
  getBrands: (params = {}) => {
    const timestamp = Date.now();
    return api.get(`/brands?_t=${timestamp}`, { params });
  },
  createBrand: (data) => api.post('/brands', data),
  updateBrand: (id, data) => api.put(`/brands/${id}`, data),
  deleteBrand: (id) => api.delete(`/brands/${id}`),

  // Orders
  getOrders: (params = {}) => {
    const timestamp = Date.now();
    return api.get(`/orders?_t=${timestamp}`, { params });
  },
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),

  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
};

// Helper function to extract data from nested API responses
export const extractData = (response) => {
  if (response.data.products) return response.data.products;
  if (response.data.categories) return response.data.categories;
  if (response.data.brands) return response.data.brands;
  if (response.data.orders) return response.data.orders;
  if (response.data.users) return response.data.users;
  // For orders and users, the API returns an array directly
  if (Array.isArray(response.data)) return response.data;
  return response.data;
};

// Helper function to handle API errors
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || `Error ${error.response.status}`;
    return { success: false, message };
  } else if (error.request) {
    // Network error
    return { success: false, message: 'Network error. Please check your connection.' };
  } else {
    // Other error
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
};

export default api; 