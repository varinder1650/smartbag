import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

// Type definitions
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'partner' | 'admin';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  apiUrl: string;
  login: (emailOrPhone: string, password: string) => Promise<LoginResult>;
  register: (userData: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateProfile: (updatedData: UpdateProfileData) => Promise<UpdateProfileResult>;
  refreshToken: () => Promise<boolean>;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface UpdateProfileData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface UpdateProfileResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface TokenData {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

console.log('=== API IMPORT DEBUG ===');
console.log('API_BASE_URL set:', API_BASE_URL);
console.log('Type of API_BASE_URL:', typeof API_BASE_URL);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('=== AUTH PROVIDER INITIALIZING ===');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== AUTH PROVIDER USE EFFECT ===');
    loadStoredAuth();
    console.log('Using API URL:', API_BASE_URL);
  }, []);

  useEffect(() => {
    // Setup token refresh interval
    let refreshInterval: NodeJS.Timeout;
    
    if (token && refreshToken) {
      // Refresh token every 15 minutes (adjust based on your token expiry)
      refreshInterval = setInterval(() => {
        handleTokenRefresh();
      }, 15 * 60 * 1000); // 15 minutes
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [token, refreshToken]);

  const loadStoredAuth = async (): Promise<void> => {
    try {
      console.log('=== LOADING STORED AUTH ===');
      const [storedToken, storedUser, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('refreshToken'),
      ]);
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setRefreshTokenState(storedRefreshToken);
        
        // Check if token is still valid
        await validateToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
      console.log('=== AUTH PROVIDER LOADED ===');
    }
  };

  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.PROFILE, {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
        },
      });
      
      if (!response.ok) {
        // Token is invalid, try to refresh
        const refreshed = await handleTokenRefresh();
        return refreshed;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const login = async (emailOrPhone: string, password: string): Promise<LoginResult> => {
    try {
      console.log('=== LOGIN DEBUG ===');
      console.log('Attempting login with URL:', API_BASE_URL);
      console.log('Full URL:', API_ENDPOINTS.LOGIN);
      
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrPhone, password }),
      });

      console.log('Login response status:', response.status);
      
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens
      setToken(data.access_token);
      setRefreshTokenState(data.refresh_token);
      setUser(data.user);

      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('token', data.access_token),
        AsyncStorage.setItem('user', JSON.stringify(data.user)),
        data.refresh_token ? AsyncStorage.setItem('refreshToken', data.refresh_token) : Promise.resolve(),
      ]);

      console.log('=== LOGIN SUCCESS ===');
      return { success: true };
    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData): Promise<RegisterResult> => {
    try {
      console.log('Attempting registration with URL:', API_BASE_URL);
      console.log('Full URL:', API_ENDPOINTS.REGISTER);
      
      const response = await fetch(API_ENDPOINTS.REGISTER, {
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
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setToken(null);
      setUser(null);
      setRefreshTokenState(null);
      await Promise.all([
        AsyncStorage.removeItem('token'),
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('refreshToken'),
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateProfile = async (updatedData: UpdateProfileData): Promise<UpdateProfileResult> => {
    try {
      console.log('Updating profile with URL:', API_ENDPOINTS.PROFILE);
      const response = await fetch(API_ENDPOINTS.PROFILE, {
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
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const handleTokenRefresh = async (): Promise<boolean> => {
    try {
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      console.log('Attempting to refresh token...');
      const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update tokens
      setToken(data.access_token);
      if (data.refresh_token) {
        setRefreshTokenState(data.refresh_token);
      }

      // Save new tokens
      await Promise.all([
        AsyncStorage.setItem('token', data.access_token),
        data.refresh_token ? AsyncStorage.setItem('refreshToken', data.refresh_token) : Promise.resolve(),
      ]);

      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout the user
      await logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    apiUrl: API_BASE_URL,
    login,
    register,
    logout,
    updateProfile,
    refreshToken: handleTokenRefresh,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};