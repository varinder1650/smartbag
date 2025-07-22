import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001/api';
  axios.defaults.baseURL = apiBaseUrl;

  // Add request interceptor for better error handling
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 429) {
        console.warn('Rate limit exceeded, retrying in 2 seconds...');
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(axios.request(error.config));
          }, 2000);
        });
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token is still valid
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrPhone, password) => {
    try {
      console.log('Sending login request with:', { emailOrPhone, password });
      const response = await axios.post('/auth/login', {
        emailOrPhone,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', response.data);
      const { token, access_token, user } = response.data;
      const authToken = token || access_token;
      if (user.role === 'admin') {
        localStorage.setItem('adminToken', authToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        setUser(user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: 'Admin access required' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 