# Google Maps API Setup Guide

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

## 2. Environment Variables

Add to your `.env` files:

### Backend (.env)
```
GOOGLE_MAPS_API_KEY=AIzaSyDyo33LbdlGo1vNxEMUQSS9W5EMNxYFJ14
```

### Mobile App (.env)
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDyo33LbdlGo1vNxEMUQSS9W5EMNxYFJ14
```

### Admin Panel (.env)
```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDyo33LbdlGo1vNxEMUQSS9W5EMNxYFJ14
```

## 3. Security (Important!)

1. In Google Cloud Console, go to "Credentials"
2. Click on your API key
3. Under "Application restrictions", select "HTTP referrers"
4. Add your domains:
   - `localhost:3000/*` (admin panel)
   - `localhost:3001/*` (backend)
   - `localhost:8081/*` (Expo dev server)
   - Your production domains

## 4. Billing

Google Maps API requires billing to be enabled. Set up billing in Google Cloud Console.

## 5. Usage Limits

Monitor your usage in Google Cloud Console to avoid unexpected charges. 