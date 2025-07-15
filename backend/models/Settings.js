const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  appFee: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
  deliveryCharge: {
    type: Number,
    required: true,
    default: 40,
    min: 0
  },
  gstRate: {
    type: Number,
    required: true,
    default: 5,
    min: 0,
    max: 100
  },
  minOrderAmount: {
    type: Number,
    required: true,
    default: 100,
    min: 0
  },
  maxDeliveryDistance: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema); 