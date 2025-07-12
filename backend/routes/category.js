const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const upload = require('../middleware/upload');

router.post('/', categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

// New route for uploading category icons
router.post('/:id/icon', upload.single('icon'), categoryController.uploadIcon);

module.exports = router; 