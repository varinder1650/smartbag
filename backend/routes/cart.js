const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.get('/', protect, cartController.getCart);
router.post('/add', protect, cartController.addOrUpdateProduct);
router.post('/remove', protect, cartController.removeProduct);
router.post('/clear', protect, cartController.clearCart);

module.exports = router; 