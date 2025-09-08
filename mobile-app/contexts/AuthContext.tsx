import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  createApiUrl,
  API_REQUEST_TIMEOUT,
} from '../config/apiConfig';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// Type definitions
interface User {
  _id: string;
  id?: string; // Add id for compatibility
  name: string;
  email: string;
  phone?: string; // Make phone optional
  role: 'customer' | 'delivery_partner' | 'admin' | 'user';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  googleId?: string;
  profilePicture?: string;
  provider?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  apiUrl: string;
  login: (email: string, password: string) => Promise<LoginResult>;
  googleLogin: (googleData: any) => Promise<LoginResult>; // Updated signature
  register: (userData: RegisterData) => Promise<RegisterResult>;
  updatePhone: (phone: string) => Promise<UpdatePhoneResult>; // Add updatePhone
  logout: () => Promise<void>;
  updateProfile: (updatedData: UpdateProfileData) => Promise<UpdateProfileResult>;
  refreshToken: () => Promise<boolean>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requires_phone?: boolean; // Add this for phone flow
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string; // Make optional
  password: string;
  confirmPassword?: string; // Make optional
}

interface RegisterResult {
  success: boolean;
  error?: string;
  message?: string;
  requires_phone?: boolean; // Add this for phone flow
}

interface UpdatePhoneResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface UpdateProfileData {
  name?: string;
  // phone?: string;
  // address?: string;
  // city?: string;
  // state?: string;
  // pincode?: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
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
      console.log('Loading stored auth...');
      const [storedToken, storedUser, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'), // Updated key to match backend
        AsyncStorage.getItem('user_data'), // Updated key
        AsyncStorage.getItem('refresh_token'), // Updated key
      ]);
      
      if (storedToken && storedUser) {
        console.log('Found stored auth, setting user and token');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setRefreshTokenState(storedRefreshToken);
        
        // Check if token is still valid
        await validateToken(storedToken);
      } else {
        console.log('No stored auth found');
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      console.log('Attempting login for:', email);
      const response = await fetchWithTimeout(
        createApiUrl('auth/login'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        },
        API_REQUEST_TIMEOUT
      );

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Login failed');
      }

      // Store tokens
      setToken(data.access_token);
      setRefreshTokenState(data.refresh_token);
      setUser(data.user);

      // Save to AsyncStorage with updated keys
      await Promise.all([
        AsyncStorage.setItem('access_token', data.access_token),
        AsyncStorage.setItem('user_data', JSON.stringify(data.user)),
        data.refresh_token ? AsyncStorage.setItem('refresh_token', data.refresh_token) : Promise.resolve(),
      ]);
      
      return { 
        success: true,
        requires_phone: data.requires_phone || false
      };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData): Promise<RegisterResult> => {
    try {
      console.log('Attempting registration for:', userData.email);
      const response = await fetch(createApiUrl('auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log('Registration response status:', response.status);
      console.log('Registration response data:', data);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Registration failed');
      }

      // Store tokens if registration includes login
      if (data.access_token) {
        setToken(data.access_token);
        setRefreshTokenState(data.refresh_token);
        setUser(data.user);

        await Promise.all([
          AsyncStorage.setItem('access_token', data.access_token),
          AsyncStorage.setItem('user_data', JSON.stringify(data.user)),
          data.refresh_token ? AsyncStorage.setItem('refresh_token', data.refresh_token) : Promise.resolve(),
        ]);
      }

      return { 
        success: true, 
        message: data.message || 'Registration successful',
        requires_phone: data.requires_phone !== false // Default to true if missing
      };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const googleLogin = async (googleToken: string, userInfo: any): Promise<LoginResult> => {
    try {
      // Send Google token and user info to your backend
      const response = await fetchWithTimeout(
        createApiUrl('auth/google'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleToken,
            user: {
              googleId: userInfo.googleId,
              email: userInfo.email,
              name: userInfo.name,
            },
          }),
        },
        API_REQUEST_TIMEOUT
      );

      const data = await response.json();
      // console.log(data)
      if (!response.ok) {
        throw new Error(data.message || 'Google login failed');
      }

      // Store tokens (same as regular login)
      setToken(data.access_token);
      setRefreshTokenState(data.refresh_token);
      setUser(data.user);

      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('token', data.access_token),
        AsyncStorage.setItem('user', JSON.stringify(data.user)),
        data.refresh_token ? AsyncStorage.setItem('refreshToken', data.refresh_token) : Promise.resolve(),
      ]);

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google login failed';
      return { success: false, error: errorMessage };
    }
  };

  const updatePhone = async (phone: string): Promise<UpdatePhoneResult> => {
    try {
      console.log('Updating phone number:', phone);
      console.log('Using token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        return { success: false, error: 'Not authenticated. Please login again.' };
      }
      
      const response = await fetch(createApiUrl('auth/phone'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      console.log('Phone update response:', response.status, data);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, logout user
          await logout();
          return { success: false, error: 'Session expired. Please login again.' };
        }
        throw new Error(data.detail || data.message || 'Failed to update phone number');
      }

      // Update user data
      const updatedUser = data.user || { ...user, phone };
      setUser(updatedUser);
      
      // Update stored user data
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Phone update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('Logging out...');
      setToken(null);
      setUser(null);
      setRefreshTokenState(null);
      await Promise.all([
        AsyncStorage.removeItem('access_token'),
        AsyncStorage.removeItem('user_data'),
        AsyncStorage.removeItem('refresh_token'),
      ]);
      console.log('Logout completed');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateProfile = async (updatedData: UpdateProfileData): Promise<UpdateProfileResult> => {
    try {
      console.log(JSON.stringify(updatedData))
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
        throw new Error(data.detail || data.message || 'Profile update failed');
      }

      setUser(data.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

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
        AsyncStorage.setItem('access_token', data.access_token),
        data.refresh_token ? AsyncStorage.setItem('refresh_token', data.refresh_token) : Promise.resolve(),
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
    googleLogin,
    register,
    updatePhone, // Add updatePhone to context
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