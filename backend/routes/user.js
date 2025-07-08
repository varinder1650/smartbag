const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user address
router.get('/address', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('address');
    res.json({ address: user.address || null });
  } catch (error) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save user address
router.post('/address', auth, async (req, res) => {
  try {
    const { address, latitude, longitude } = req.body;

    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        address: address.trim(),
        location: {
          latitude: latitude || null,
          longitude: longitude || null,
        }
      },
      { new: true }
    );

    res.json({ 
      message: 'Address saved successfully',
      address: user.address,
      location: user.location
    });
  } catch (error) {
    console.error('Error saving user address:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user address
router.put('/address', auth, async (req, res) => {
  try {
    const { address, latitude, longitude } = req.body;

    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        address: address.trim(),
        location: {
          latitude: latitude || null,
          longitude: longitude || null,
        }
      },
      { new: true }
    );

    res.json({ 
      message: 'Address updated successfully',
      address: user.address,
      location: user.location
    });
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 