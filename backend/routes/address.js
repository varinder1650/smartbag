const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Search addresses using Google Maps Places Autocomplete API
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Google Maps API key not configured' });
    }

    // Use Places Autocomplete API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:in`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      res.json({ predictions: data.predictions });
    } else {
      res.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Address search error:', error);
    res.status(500).json({ message: 'Error searching addresses' });
  }
});

// Geocode address to get coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Google Maps API key not configured' });
    }

    // Geocode the address
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      
      res.json({
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address
      });
    } else {
      res.status(404).json({ message: 'Address not found' });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ message: 'Error geocoding address' });
  }
});

// Validate address using Google Maps Geocoding API
router.post('/validate', protect, async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Google Maps API key not configured' });
    }

    // Geocode the address
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      
      // Extract address components
      const addressComponents = result.address_components;
      const streetNumber = addressComponents.find(component => 
        component.types.includes('street_number')
      )?.long_name || '';
      
      const route = addressComponents.find(component => 
        component.types.includes('route')
      )?.long_name || '';
      
      const locality = addressComponents.find(component => 
        component.types.includes('locality')
      )?.long_name || '';
      
      const postalCode = addressComponents.find(component => 
        component.types.includes('postal_code')
      )?.long_name || '';
      
      const country = addressComponents.find(component => 
        component.types.includes('country')
      )?.long_name || '';
      
      res.json({
        valid: true,
        coordinates: { latitude: lat, longitude: lng },
        formattedAddress: result.formatted_address,
        addressComponents: {
          street: `${streetNumber} ${route}`.trim(),
          city: locality,
          pincode: postalCode,
          country: country
        }
      });
    } else {
      res.json({
        valid: false,
        message: 'Address not found or invalid'
      });
    }
  } catch (error) {
    console.error('Address validation error:', error);
    res.status(500).json({ message: 'Error validating address' });
  }
});

// Get address from coordinates (reverse geocoding)
router.post('/reverse-geocode', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Google Maps API key not configured' });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components;
      
      const streetNumber = addressComponents.find(component => 
        component.types.includes('street_number')
      )?.long_name || '';
      
      const route = addressComponents.find(component => 
        component.types.includes('route')
      )?.long_name || '';
      
      const locality = addressComponents.find(component => 
        component.types.includes('locality')
      )?.long_name || '';
      
      const postalCode = addressComponents.find(component => 
        component.types.includes('postal_code')
      )?.long_name || '';
      
      const country = addressComponents.find(component => 
        component.types.includes('country')
      )?.long_name || '';
      
      res.json({
        formattedAddress: result.formatted_address,
        addressComponents: {
          street: `${streetNumber} ${route}`.trim(),
          city: locality,
          pincode: postalCode,
          country: country
        }
      });
    } else {
      res.status(404).json({ message: 'Address not found for these coordinates' });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ message: 'Error getting address from coordinates' });
  }
});

module.exports = router; 