const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const { 
      items, 
      deliveryAddress, 
      paymentMethod, 
      subtotal, 
      tax, 
      deliveryCharge, 
      appFee, 
      totalAmount 
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    if (!deliveryAddress || !deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.pincode) {
      return res.status(400).json({ message: 'Complete delivery address is required' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Valid total amount is required' });
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cod',
      subtotal: subtotal || 0,
      tax: tax || 0,
      deliveryCharge: deliveryCharge || 0,
      appFee: appFee || 0,
      totalAmount,
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
    });

    // Populate product details for response
    await order.populate({
      path: 'items.product',
      select: 'name price images brand category',
      populate: [
        { path: 'brand', select: 'name' },
        { path: 'category', select: 'name' }
      ]
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price images brand category',
        populate: [
          { path: 'brand', select: 'name' },
          { path: 'category', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate({
        path: 'items.product',
        select: 'name price images brand category',
        populate: [
          { path: 'brand', select: 'name' },
          { path: 'category', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email phone');
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(400).json({ message: err.message });
  }
}; 