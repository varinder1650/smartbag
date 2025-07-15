const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

// Public route to get settings (for mobile app)
router.get('/public', settingsController.getPublicSettings);

// Protected routes (admin only)
router.get('/', protect, admin, settingsController.getSettings);
router.put('/', protect, admin, settingsController.updateSettings);

module.exports = router; 