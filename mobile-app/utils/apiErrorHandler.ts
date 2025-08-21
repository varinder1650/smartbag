// utils/apiErrorHandler.ts - Centralized API error handling
export interface ApiError {
    message: string;
    status: number;
    code?: string;
    details?: any;
  }
  
  export class ApiErrorHandler {
    static handle(error: any, context: string = 'API'): ApiError {
      console.error(`${context} Error:`, error);
  
      // Network errors
      if (!error.response && error.request) {
        return {
          message: 'Network error. Please check your connection.',
          status: 0,
          code: 'NETWORK_ERROR',
          details: error.message,
        };
      }
  
      // HTTP errors
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 400:
            return {
              message: data?.message || 'Invalid request.',
              status,
              code: 'BAD_REQUEST',
              details: data,
            };
          case 401:
            return {
              message: 'Authentication required. Please login.',
              status,
              code: 'UNAUTHORIZED',
              details: data,
            };
          case 403:
            return {
              message: 'Access denied.',
              status,
              code: 'FORBIDDEN',
              details: data,
            };
          case 404:
            return {
              message: 'Resource not found.',
              status,
              code: 'NOT_FOUND',
              details: data,
            };
          case 500:
            return {
              message: 'Server error. Please try again later.',
              status,
              code: 'SERVER_ERROR',
              details: data,
            };
          default:
            return {
              message: data?.message || 'An unexpected error occurred.',
              status,
              code: 'UNKNOWN_ERROR',
              details: data,
            };
        }
      }
  
      // Generic errors
      return {
        message: error.message || 'An unexpected error occurred.',
        status: 0,
        code: 'GENERIC_ERROR',
        details: error,
      };
    }
  
    static isNetworkError(error: ApiError): boolean {
      return error.code === 'NETWORK_ERROR' || error.status === 0;
    }
  
    static isAuthError(error: ApiError): boolean {
      return error.status === 401 || error.code === 'UNAUTHORIZED';
    }
  
    static shouldRetry(error: ApiError): boolean {
      // Retry on network errors and 5xx server errors
      return this.isNetworkError(error) || (error.status >= 500 && error.status < 600);
    }
  }
  
  // Enhanced fetch wrapper with error handling
  export const apiRequest = async (
    url: string,
    options: RequestInit = {},
    retries: number = 2
  ): Promise<Response> => {
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
  
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, defaultOptions);
        
        // Don't retry successful responses
        if (response.ok) {
          return response;
        }
        
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Retry server errors (5xx) and network issues
        if (attempt < retries) {
          console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
          continue;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (attempt < retries && (error as any).name === 'TypeError') {
          // Network error, retry
          console.warn(`Network error (attempt ${attempt + 1}/${retries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Maximum retry attempts exceeded');
  };
  
  // Hook for API requests with error handling
  import { useState, useCallback } from 'react';
  import { Alert } from 'react-native';
  
  export const useApiRequest = () => {
    const [loading, setLoading] = useState(false);
  
    const request = useCallback(async <T>(
      apiCall: () => Promise<T>,
      options: {
        showErrors?: boolean;
        context?: string;
        onError?: (error: ApiError) => void;
      } = {}
    ): Promise<{ data?: T; error?: ApiError }> => {
      const { showErrors = true, context = 'API', onError } = options;
      
      setLoading(true);
      try {
        const data = await apiCall();
        return { data };
      } catch (error) {
        const apiError = ApiErrorHandler.handle(error, context);
        
        if (onError) {
          onError(apiError);
        } else if (showErrors) {
          Alert.alert('Error', apiError.message);
        }
        
        return { error: apiError };
      } finally {
        setLoading(false);
      }
    }, []);
  
    return { request, loading };
  };