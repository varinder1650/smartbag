const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.post('/', protect, upload.array('images', 10), productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', protect, upload.array('images', 10), productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router; 