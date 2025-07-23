# Home Screen Troubleshooting Guide

## Overview

This guide addresses issues with the home screen not displaying properly in the SmartBag mobile app. The most common causes are:

1. Authentication issues
2. API configuration problems
3. User role validation errors
4. Tab navigation configuration issues
5. Component rendering problems

## Quick Fix

We've implemented a diagnostic tool to help identify and fix home screen display issues:

1. The app now includes a `FixHomeScreen` component that runs diagnostics on startup
2. Review the diagnostic results and follow the recommended fixes
3. If the automatic fixes don't resolve the issue, follow the manual troubleshooting steps below

## Manual Troubleshooting Steps

### 1. Check Authentication

The home screen requires a valid authenticated user with a proper role:

```javascript
// In app/(tabs)/_layout.tsx
if (!user || !user.role) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
```

**Fix:** Ensure you're properly logged in with a valid user account. Try logging out and logging back in.

### 2. Verify API Configuration

The app requires a properly configured API URL to fetch data:

```javascript
// In config/apiConfig.js
export const API_BASE_URL = getApiBaseUrl();
```

**Fix:** Check your `.env` file and ensure `EXPO_PUBLIC_API_URL` is set correctly. The default fallback is `https://smartbag.onrender.com/api`.

### 3. Check User Role

Tab navigation depends on the user role:

```javascript
// In app/(tabs)/_layout.tsx
const isPartner = user.role === 'partner';
```

**Fix:** Ensure your user account has a valid role assigned (user, partner, or admin).

### 4. Debug API Connectivity

API connectivity issues can prevent data from loading:

```javascript
// Run this in your console
import testApiConnection from './test-api-connection';
testApiConnection().then(console.log);
```

**Fix:** Check your network connection and ensure the API server is running.

### 5. Clear Cache and Restart

Sometimes cached data can cause rendering issues:

```bash
# Clear Expo cache
npx expo start --clear
```

**Fix:** Clear the Expo cache and restart the development server.

## Advanced Debugging

For more advanced debugging, you can use the following tools:

1. **debug-env.js** - Diagnoses environment variable issues
2. **debug-render.js** - Tests component rendering
3. **test-api-connection.js** - Tests API connectivity

## Common Error Messages

### "Cannot read property 'role' of null"

This indicates that the user object is null, likely due to authentication issues.

**Fix:** Check authentication state and ensure the user is properly logged in.

### "Network request failed"

This indicates API connectivity issues.

**Fix:** Check your network connection and API configuration.

### "Unexpected token in JSON"

This indicates malformed JSON responses from the API.

**Fix:** Check API responses and ensure they're valid JSON.

## Contact Support

If you've tried all the troubleshooting steps and still can't resolve the issue, please contact support with the following information:

1. Diagnostic results from FixHomeScreen
2. API configuration details
3. Authentication state
4. Error messages from the console

## Additional Resources

- [API_URL_HANDLING.md](./API_URL_HANDLING.md)
- [ENV_SETUP.md](./ENV_SETUP.md)
- [TROUBLESHOOTING-API.md](./TROUBLESHOOTING-API.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)