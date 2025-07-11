const Product = require('../models/Product');

exports.createProduct = async (req, res) => {
  try {
    console.log('Create Product Request Body:', req.body);
    console.log('Create Product Files:', req.files);
    
    // Handle both uploaded files and existing image URLs
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    // Also check for existing image URLs in the form data
    if (req.body.images) {
      const existingImages = Array.isArray(req.body.images) 
        ? req.body.images 
        : [req.body.images];
      images = [...images, ...existingImages];
    }
    
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price) || 0,
      stock: parseInt(req.body.stock) || 0,
      category: req.body.category,
      brand: req.body.brand,
      images: images
    };
    
    console.log('Product Data to Create:', productData);
    
    // Validate required fields
    if (!productData.name || !productData.description || !productData.category || !productData.brand) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, category, and brand are required' 
      });
    }
    
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create Product Error:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      search, 
      minPrice, 
      maxPrice, 
      inStock,
      page = 1, 
      limit = 20 
    } = req.query;

    // Build query object
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with optimization
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .select('name description price images stock category brand')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Convert to plain JavaScript objects for better performance

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNextPage: skip + products.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Get Products Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category brand');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('Update Product Request Body:', req.body);
    console.log('Update Product Files:', req.files);
    
    // Handle both uploaded files and existing image URLs
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    // Also check for existing image URLs in the form data
    if (req.body.images) {
      const existingImages = Array.isArray(req.body.images) 
        ? req.body.images 
        : [req.body.images];
      images = [...images, ...existingImages];
    }
    
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price) || 0,
      stock: parseInt(req.body.stock) || 0,
      category: req.body.category,
      brand: req.body.brand,
      images: images
    };
    
    console.log('Product Data to Update:', productData);
    
    // Validate required fields
    if (!productData.name || !productData.description || !productData.category || !productData.brand) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, category, and brand are required' 
      });
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 