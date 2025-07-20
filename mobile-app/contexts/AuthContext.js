import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use computer's IP address for React Native development
const API_BASE_URL = 'http://10.0.0.74:3001/api';

console.log('=== API IMPORT DEBUG ===');
console.log('API_BASE_URL set:', API_BASE_URL);
console.log('Type of API_BASE_URL:', typeof API_BASE_URL);

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log('=== AUTH PROVIDER INITIALIZING ===');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('=== AUTH PROVIDER USE EFFECT ===');
    loadStoredAuth();
    console.log('Using API URL:', API_BASE_URL);
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('=== LOADING STORED AUTH ===');
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
      console.log('=== AUTH PROVIDER LOADED ===');
    }
  };

  const login = async (emailOrPhone, password) => {
    try {
      console.log('=== LOGIN DEBUG ===');
      console.log('Attempting login with URL:', API_BASE_URL);
      console.log('Full URL:', `${API_BASE_URL}/auth/login`);
      console.log('Request body:', { emailOrPhone, password });
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrPhone, password }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);
      
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.access_token);
      setUser(data.user);

      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      console.log('=== LOGIN SUCCESS ===');
      return { success: true };
    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      console.log('Attempting registration with URL:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('Registration response status:', response.status);
      const data = await response.json();
      console.log('Registration response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateProfile = async (updatedData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      setUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    apiUrl: API_BASE_URL,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 