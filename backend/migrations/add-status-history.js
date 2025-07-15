const mongoose = require('mongoose');
const Order = require('../models/Order');
require('dotenv').config();

const migrateStatusHistory = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all orders that don't have statusChangeHistory
    const orders = await Order.find({
      $or: [
        { statusChangeHistory: { $exists: false } },
        { statusChangeHistory: { $size: 0 } }
      ]
    });

    console.log(`Found ${orders.length} orders to migrate`);

    for (const order of orders) {
      // Map old status values to new ones
      let mappedStatus = order.status;
      if (order.status === 'shipped') {
        mappedStatus = 'out_for_delivery';
        order.status = 'out_for_delivery';
      }

      // Add initial status change history
      order.statusChangeHistory = [{
        status: mappedStatus,
        changedAt: order.createdAt || new Date(),
        changedBy: 'Migration',
      }];

      await order.save();
      console.log(`Migrated order ${order._id} - status: ${order.status}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateStatusHistory(); 