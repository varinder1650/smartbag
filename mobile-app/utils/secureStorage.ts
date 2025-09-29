// utils/secureStorage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

class SecureStorageManager {
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
        return;
      }

      await SecureStore.setItemAsync(key, value, {
        requireAuthentication: false,
        keychainService: 'smartbag_keychain',
        sharedPreferencesName: 'smartbag_prefs',
      });
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      await AsyncStorage.setItem(key, value);
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }

      return await SecureStore.getItemAsync(key, {
        keychainService: 'smartbag_keychain',
        sharedPreferencesName: 'smartbag_prefs',
      });
    } catch (error) {
      console.error(`Error retrieving secure item ${key}:`, error);
      return await AsyncStorage.getItem(key);
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key, {
        keychainService: 'smartbag_keychain',
        sharedPreferencesName: 'smartbag_prefs',
      });
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      await AsyncStorage.removeItem(key);
    }
  }

  async storeAuthData(accessToken: string, refreshToken?: string, userData?: any): Promise<void> {
    try {
      await Promise.all([
        this.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        refreshToken ? this.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken) : Promise.resolve(),
        userData ? this.setSecureItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  async getAuthData(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    userData: any | null;
  }> {
    try {
      const [accessToken, refreshToken, userDataString] = await Promise.all([
        this.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.getSecureItem(STORAGE_KEYS.USER_DATA),
      ]);

      let userData = null;
      if (userDataString) {
        try {
          userData = JSON.parse(userDataString);
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
        }
      }

      return {
        accessToken,
        refreshToken,
        userData,
      };
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      return {
        accessToken: null,
        refreshToken: null,
        userData: null,
      };
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        this.removeSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.removeSecureItem(STORAGE_KEYS.USER_DATA),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  async hasAuthData(): Promise<boolean> {
    try {
      const accessToken = await this.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
      return !!accessToken;
    } catch (error) {
      console.error('Error checking auth data:', error);
      return false;
    }
  }
}

export const secureStorage = new SecureStorageManager();