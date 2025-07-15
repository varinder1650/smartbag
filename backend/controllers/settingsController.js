const Settings = require('../models/Settings');

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ isActive: true });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({
        appFee: 10,
        deliveryCharge: 40,
        gstRate: 5,
        minOrderAmount: 100,
        maxDeliveryDistance: 10,
        isActive: true
      });
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const { appFee, deliveryCharge, gstRate, minOrderAmount, maxDeliveryDistance } = req.body;
    
    // Validate input
    if (appFee < 0 || deliveryCharge < 0 || gstRate < 0 || gstRate > 100 || 
        minOrderAmount < 0 || maxDeliveryDistance < 0) {
      return res.status(400).json({ message: 'Invalid settings values' });
    }
    
    let settings = await Settings.findOne({ isActive: true });
    
    if (settings) {
      // Update existing settings
      settings.appFee = appFee;
      settings.deliveryCharge = deliveryCharge;
      settings.gstRate = gstRate;
      settings.minOrderAmount = minOrderAmount;
      settings.maxDeliveryDistance = maxDeliveryDistance;
      await settings.save();
    } else {
      // Create new settings
      settings = await Settings.create({
        appFee,
        deliveryCharge,
        gstRate,
        minOrderAmount,
        maxDeliveryDistance,
        isActive: true
      });
    }
    
    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get settings for public use (no auth required)
exports.getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ isActive: true });
    
    if (!settings) {
      // Return default values if no settings exist
      settings = {
        appFee: 10,
        deliveryCharge: 40,
        gstRate: 5,
        minOrderAmount: 100,
        maxDeliveryDistance: 10
      };
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 