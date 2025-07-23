# API URL Handling Guide

## Overview

This document provides guidance on proper API URL handling in the SmartBag mobile app to ensure consistent and reliable API connections.

## Common Issues Identified

Through our diagnostics, we identified several common issues with API URL handling:

1. **Inconsistent trailing slashes** in base URLs
2. **Inconsistent leading slashes** in endpoint paths
3. **Double slashes** in constructed URLs
4. **Redirects** due to improper URL formatting

## Best Practices

### Base URL Formatting

- **Always ensure the base URL ends with a trailing slash**
- Example: `https://api.example.com/api/` ✅
- Not: `https://api.example.com/api` ❌

### Endpoint Path Formatting

- **Never include a leading slash in endpoint paths**
- Example: `categories` ✅
- Not: `/categories` ❌

### URL Construction

- Always use the `joinApiUrl` utility function to construct full API URLs
- This function handles proper joining of base URL and endpoint paths

```javascript
// Correct way to construct API URLs
import { joinApiUrl } from '../utils/apiUtils';

const categoriesUrl = joinApiUrl(API_BASE_URL, 'categories');
// Result: https://api.example.com/api/categories
```

## Utility Functions

The following utility functions are available in `utils/apiUtils.js`:

### `ensureTrailingSlash(url)`

Ensures a URL ends with a trailing slash.

```javascript
ensureTrailingSlash('https://api.example.com/api');
// Returns: 'https://api.example.com/api/'
```

### `removeLeadingSlash(path)`

Removes a leading slash from a path if present.

```javascript
removeLeadingSlash('/categories');
// Returns: 'categories'
```

### `joinApiUrl(baseUrl, path)`

Joins a base URL and a path, ensuring proper formatting.

```javascript
joinApiUrl('https://api.example.com/api/', 'categories');
// Returns: 'https://api.example.com/api/categories'
```

### `createApiUrl(baseUrl, path)`

Creates a properly formatted API URL by ensuring the base URL has a trailing slash and the path has no leading slash.

```javascript
createApiUrl('https://api.example.com/api', '/categories');
// Returns: 'https://api.example.com/api/categories'
```

### `testApiEndpoint(url)`

Tests an API endpoint and returns detailed information about the response.

### `diagnoseApiUrl(url)`

Diagnoses common API URL issues and provides suggestions for fixing them.

### `analyzeApiError(error, url)`

Analyzes API errors and provides detailed information about the cause and potential solutions.

### `fixApiUrl(url)`

Attempts to fix common issues in API URLs.

## Debugging Tools

### EnhancedApiDebugger Component

The `EnhancedApiDebugger` component provides a comprehensive UI for debugging API connections:

- Displays API configuration information
- Tests API endpoints with detailed results
- Shows response times and redirect information
- Provides error analysis and suggestions

### API Diagnostics Script

The `api-diagnostics.js` script can be run to perform API diagnostics from the command line:

```bash
node api-diagnostics.js
```

## Implementation in the Codebase

### API Configuration

API endpoints are defined in `config/apiConfig.js` using the utility functions to ensure proper URL formatting:

```javascript
import { ensureTrailingSlash, removeLeadingSlash, joinApiUrl } from '../utils/apiUtils';

// Get API base URL from environment or fallback
const getApiBaseUrl = () => {
  // ... logic to get API URL from environment
  return ensureTrailingSlash(apiUrl);
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  LOGIN: joinApiUrl(API_BASE_URL, 'auth/login'),
  REGISTER: joinApiUrl(API_BASE_URL, 'auth/register'),
  // ... other endpoints
};
```

### API Service

API calls in `services/api.js` use the predefined endpoints:

```javascript
import { API_ENDPOINTS } from '../config/apiConfig';

export const getCategories = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.CATEGORIES);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

## Troubleshooting

If you encounter API connection issues:

1. Check that the API base URL is correctly configured with a trailing slash
2. Verify that endpoint paths do not include leading slashes
3. Use the `EnhancedApiDebugger` component to diagnose issues
4. Run the `api-diagnostics.js` script for detailed diagnostics
5. Check for redirects in API responses, which may indicate URL formatting issues

## Conclusion

Consistent URL handling is critical for reliable API connections. By following these guidelines and using the provided utility functions, you can avoid common issues and ensure your API calls work correctly across different environments.