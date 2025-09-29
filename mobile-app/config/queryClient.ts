import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { secureStorage } from '../utils/secureStorage';

// Error handler for queries
const handleQueryError = (error: any, query: any) => {
  console.error('Query Error:', {
    queryKey: query.queryKey,
    error: error.message,
    status: error.status,
  });

  // Handle authentication errors globally
  if (error.status === 401) {
    // Clear stored auth data
    secureStorage.clearAuthData().catch(console.error);
    
    // Don't show alert for auth errors in background queries
    if (query.meta?.showErrorAlert !== false) {
      Alert.alert(
        'Session Expired',
        'Please log in again to continue.',
        [{ text: 'OK' }]
      );
    }
  }
};

// Error handler for mutations
const handleMutationError = (error: any, variables: any, context: any, mutation: any) => {
  console.error('Mutation Error:', {
    mutationKey: mutation.options.mutationKey,
    error: error.message,
    status: error.status,
  });

  // Show user-friendly error messages
  if (mutation.meta?.showErrorAlert !== false) {
    const errorMessage = error.status === 401 
      ? 'Session expired. Please log in again.'
      : error.message || 'Something went wrong. Please try again.';
    
    Alert.alert('Error', errorMessage);
  }
};

// Create query cache with error handling
const queryCache = new QueryCache({
  onError: handleQueryError,
});

// Create mutation cache with error handling
const mutationCache = new MutationCache({
  onError: handleMutationError,
});

// Create a new QueryClient instance with optimized settings
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests intelligently
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry on validation errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for server errors and network issues
        return failureCount < 3;
      },
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus in development only
      refetchOnWindowFocus: __DEV__,
      // Refetch on reconnect
      refetchOnReconnect: 'always',
      // Enable background refetching
      refetchOnMount: true,
      // Network mode configuration
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once for server errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 500 && failureCount < 1) {
          return true;
        }
        return false;
      },
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query keys for better organization and type safety
export const QUERY_KEYS = {
  // Authentication
  AUTH: {
    USER: ['auth', 'user'],
    PROFILE: ['auth', 'profile'],
  },
  
  // Products
  PRODUCTS: {
    ALL: ['products'],
    LIST: (filters?: any) => ['products', 'list', filters],
    DETAIL: (id: string) => ['products', 'detail', id],
    SEARCH: (query: string) => ['products', 'search', query],
  },
  
  // Categories
  CATEGORIES: {
    ALL: ['categories'],
    LIST: ['categories', 'list'],
    DETAIL: (id: string) => ['categories', 'detail', id],
  },
  
  // Cart
  CART: {
    ITEMS: ['cart', 'items'],
    COUNT: ['cart', 'count'],
  },
  
  // Orders
  ORDERS: {
    ALL: ['orders'],
    LIST: (filters?: any) => ['orders', 'list', filters],
    DETAIL: (id: string) => ['orders', 'detail', id],
    USER_ORDERS: (userId: string) => ['orders', 'user', userId],
  },
  
  // Address
  ADDRESS: {
    USER_ADDRESSES: ['address', 'user'],
    SEARCH: (query: string) => ['address', 'search', query],
  },
  
  // Delivery (for delivery partners)
  DELIVERY: {
    AVAILABLE_ORDERS: ['delivery', 'available'],
    ASSIGNED_ORDERS: ['delivery', 'assigned'],
    DELIVERED_ORDERS: ['delivery', 'delivered'],
  },
} as const;

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all queries for a specific key pattern
  invalidateQueries: (queryKey: any[]) => {
    return queryClient.invalidateQueries({ queryKey });
  },
  
  // Remove specific query from cache
  removeQueries: (queryKey: any[]) => {
    return queryClient.removeQueries({ queryKey });
  },
  
  // Set query data manually (useful for optimistic updates)
  setQueryData: <T>(queryKey: any[], data: T | ((prev: T | undefined) => T)) => {
    return queryClient.setQueryData(queryKey, data);
  },
  
  // Get query data from cache
  getQueryData: <T>(queryKey: any[]): T | undefined => {
    return queryClient.getQueryData(queryKey);
  },
  
  // Prefetch query
  prefetchQuery: (queryKey: any[], queryFn: () => Promise<any>, staleTime?: number) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: staleTime || 5 * 60 * 1000, // 5 minutes default
    });
  },
  
  // Clear all cache
  clear: () => {
    queryClient.clear();
  },
  
  // Get cache size info
  getCacheInfo: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      cachedData: queries.map(q => ({
        queryKey: q.queryKey,
        state: q.state.status,
        lastUpdated: q.state.dataUpdatedAt,
        observers: q.getObserversCount(),
      })),
    };
  },
};

// Performance monitoring
export const performanceMonitor = {
  // Log slow queries
  logSlowQueries: (threshold: number = 2000) => {
    const cache = queryClient.getQueryCache();
    cache.subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') {
        const duration = Date.now() - (event.query.state.fetchMeta?.startTime || 0);
        if (duration > threshold) {
          console.warn(`Slow query detected (${duration}ms):`, event.query.queryKey);
        }
      }
    });
  },
  
  // Get performance metrics
  getMetrics: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const metrics = queries.reduce((acc, query) => {
      const state = query.state;
      acc.totalQueries++;
      
      if (state.status === 'success') acc.successQueries++;
      if (state.status === 'error') acc.errorQueries++;
      if (state.status === 'loading') acc.loadingQueries++;
      
      if (state.fetchMeta?.startTime) {
        const duration = (state.dataUpdatedAt || Date.now()) - state.fetchMeta.startTime;
        acc.totalFetchTime += duration;
        acc.averageFetchTime = acc.totalFetchTime / acc.totalQueries;
      }
      
      return acc;
    }, {
      totalQueries: 0,
      successQueries: 0,
      errorQueries: 0,
      loadingQueries: 0,
      totalFetchTime: 0,
      averageFetchTime: 0,
    });
    
    return metrics;
  },
};

// Initialize performance monitoring in development
if (__DEV__) {
  performanceMonitor.logSlowQueries(1000); // Log queries taking more than 1 second
}