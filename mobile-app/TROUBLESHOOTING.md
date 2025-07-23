# SmartBag Mobile App Troubleshooting Guide

## White Screen / Loading Screen Issue

If you're experiencing a white screen or endless loading screen when launching the app, follow these troubleshooting steps:

### 1. Environment Variables Configuration

The most common cause of startup issues is incorrect environment variable configuration. We've made the following changes to fix this:

- Updated `app.json` to use hardcoded values instead of dynamic environment variables
- Added robust fallback mechanisms in `apiConfig.js`
- Added error handling in the app's root layout

### 2. Restart the Development Server

After making changes to environment variables or configuration files, you need to restart the development server:

```bash
# Stop any running instances first
npm start -- --clear
```

The `--clear` flag ensures that the cache is cleared, which is important after configuration changes.

### 3. Check Console Logs

We've added extensive logging to help diagnose issues:

- Check the terminal where you're running the Expo server for error messages
- Look for logs from `ApiDebugger` component which shows environment variable status
- Check for any API connection errors

### 4. Verify API Connectivity

Ensure that the API server is accessible:

```bash
curl https://smartbag.onrender.com/api/categories
```

If this doesn't return data, there might be an issue with the backend server.

### 5. Temporary Debug Mode

We've added a temporary `ApiDebugger` component to the app's root layout. This will display information about the API configuration when the app starts. Once you've resolved the issues, you can remove this component from `_layout.tsx`.

### 6. Common Solutions

- **API URL Issues**: Make sure the API URL in `.env` and `app.json` ends with a trailing slash
- **Expo Constants**: If `Constants.expoConfig` is undefined, the app will fall back to hardcoded values
- **Network Connectivity**: Ensure your device has internet access and can reach the backend server

## Next Steps

Once the app is working correctly:

1. Remove the `ApiDebugger` component from `_layout.tsx`
2. Consider keeping the error handling improvements for better user experience
3. If you want to use environment variables dynamically again, you'll need to set up a proper build process with Expo