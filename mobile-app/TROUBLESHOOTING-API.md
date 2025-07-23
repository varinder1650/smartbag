# API Connection Troubleshooting Guide

## Common API Connection Issues

If you're experiencing a white screen or API connection issues in the SmartBag mobile app, follow these troubleshooting steps:

### 1. Check API URL Format

The API URL must end with a trailing slash (`/`). The app has been updated to automatically add this if missing, but you should verify your `.env` file and `app.json` configuration.

```
# Correct format
EXPO_PUBLIC_API_URL=https://smartbag.onrender.com/api/

# Incorrect format
EXPO_PUBLIC_API_URL=https://smartbag.onrender.com/api
```

### 2. Verify API Endpoints

API endpoints should NOT include a leading slash when combined with the base URL. The app has been updated to fix this issue.

```javascript
// Correct format
`${API_BASE_URL}auth/login`

// Incorrect format
`${API_BASE_URL}/auth/login`
```

### 3. Test API Connection

Use the included `test-api-connection.js` file to verify your API connection:

```javascript
import testApiConnection from './test-api-connection';

// In your component
const testConnection = async () => {
  const result = await testApiConnection();
  console.log('API connection test result:', result);
};
```

### 4. Check Network Connectivity

Ensure your device has internet connectivity and can reach the API server.

```bash
# Test from terminal
curl -v https://smartbag.onrender.com/api/categories/
```

### 5. Debug Environment Variables

Use the `ApiDebugger` component to verify environment variables are loaded correctly:

```jsx
import ApiDebugger from './components/ApiDebugger';

// In your component
<ApiDebugger />
```

### 6. Clear Cache and Restart

Sometimes clearing the Expo cache and restarting can resolve issues:

```bash
# Clear Expo cache
expo start -c

# Or with npm
npm start -- --reset-cache
```

## Recent Fixes

The following issues have been fixed in the latest update:

1. Added automatic trailing slash to API base URL
2. Removed leading slashes from API endpoints
3. Added comprehensive error handling
4. Added API connection testing

If you continue to experience issues after following these steps, please contact the development team.