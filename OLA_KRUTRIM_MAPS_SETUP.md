# Ola Krutrim Maps API Setup Guide

## 1. Get Ola Krutrim Maps API Key

1. Go to [Ola Krutrim Developer Portal](https://developer.krutrim.ai/)
2. Create a new account or sign in to existing account
3. Navigate to the Maps API section
4. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Reverse Geocoding API
5. Go to "Credentials" → "Create Credentials" → "API Key"
6. Copy your API key

## 2. Environment Variables

Add to your `.env` files:

### Backend (.env)
```
OLA_KRUTRIM_API_KEY=your-ola-krutrim-api-key-here
```

### Mobile App (.env)
```
EXPO_PUBLIC_OLA_KRUTRIM_API_KEY=your-ola-krutrim-api-key-here
```

### Admin Panel (.env)
```
REACT_APP_OLA_KRUTRIM_API_KEY=your-ola-krutrim-api-key-here
```

## 3. Security (Important!)

1. In Ola Krutrim Developer Portal, go to "Credentials"
2. Click on your API key
3. Under "Application restrictions", select "HTTP referrers"
4. Add your domains:
   - `localhost:3000/*` (admin panel)
   - `localhost:3001/*` (backend)
   - `localhost:8081/*` (Expo dev server)
   - Your production domains

## 4. API Endpoints

The following endpoints are used in the application:

### Places Autocomplete
```
GET https://api.krutrim.ai/v1/maps/places/autocomplete
```

### Geocoding
```
GET https://api.krutrim.ai/v1/maps/geocode
```

### Reverse Geocoding
```
GET https://api.krutrim.ai/v1/maps/reverse-geocode
```

## 5. Usage Limits

Monitor your usage in Ola Krutrim Developer Portal to avoid unexpected charges.

## 6. Migration from Google Maps

This setup replaces Google Maps API with Ola Krutrim Maps API. The following changes have been made:

### Backend Changes
- Updated `backend/routes/address.py` to use Ola Krutrim endpoints
- Changed environment variable from `GOOGLE_MAPS_API_KEY` to `OLA_KRUTRIM_API_KEY`
- Updated API endpoints to use `https://api.krutrim.ai/v1/maps/`

### Mobile App Changes
- Updated `mobile-app/components/AddressMapPicker.js` to use Ola Krutrim reverse geocoding
- Updated environment variable references

### Configuration Files
- Updated `backend/start.sh` and `backend/start.bat` with new environment variable
- Updated `backend/README.md` with Ola Krutrim references

## 7. Testing

After setting up your API key:

1. Start the backend server
2. Test address search functionality
3. Test geocoding and reverse geocoding
4. Verify map integration in mobile app

## 8. Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Ensure `OLA_KRUTRIM_API_KEY` is set in your environment variables
   - Check that the API key is valid and has proper permissions

2. **CORS Issues**
   - Verify your domain is added to the allowed referrers in Ola Krutrim Developer Portal

3. **Rate Limiting**
   - Check your API usage limits in the developer portal
   - Implement proper error handling for rate limit responses

4. **Address Not Found**
   - Ensure the address format is correct
   - Check if the location is within supported regions

## 9. Support

For technical support with Ola Krutrim Maps API:
- Visit the [Ola Krutrim Developer Documentation](https://docs.krutrim.ai/)
- Check the [API Reference](https://docs.krutrim.ai/maps-api)
- Contact Ola Krutrim Developer Support 