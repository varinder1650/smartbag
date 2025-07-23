# Environment Variables Setup Guide

## Overview

This guide explains how to set up environment variables for the SmartBag mobile app to connect to your hosted backend.

## Current Configuration

The app has been updated to use a centralized API configuration system that reads from environment variables. This allows you to easily switch between development and production environments without changing code.

## Environment Variables

Create or update your `.env` file in the mobile-app directory with the following variables:

```
# API Configuration
EXPO_PUBLIC_API_URL=https://smartbag.onrender.com/api/

# Ola Krutrim Maps API Key (if using)
EXPO_PUBLIC_OLA_KRUTRIM_API_KEY=your-api-key-here
```

## How It Works

1. The app reads the `EXPO_PUBLIC_API_URL` environment variable to determine the API endpoint.
2. If the environment variable is not set, it falls back to the production URL.
3. All API calls throughout the app now use this centralized configuration.

## Testing Different Environments

### Development Environment

To test against a local development server:

```
EXPO_PUBLIC_API_URL=http://10.0.0.74:3001/api
```

Replace `10.0.0.74` with your computer's IP address on your local network.

### Production Environment

To use the production backend:

```
EXPO_PUBLIC_API_URL=https://smartbag.onrender.com/api/
```

## Troubleshooting

If you're experiencing connection issues:

1. Verify that your `.env` file is properly formatted
2. Check that the API URL is correct and includes the trailing slash
3. Ensure your backend server is running and accessible
4. Check the console logs for any API connection errors
5. Try restarting the Expo development server with `npm start -- --clear`

## Additional Notes

- The environment variables are loaded at build time for production builds
- For development, changes to `.env` require restarting the Expo server
- Make sure your backend CORS settings allow requests from your app