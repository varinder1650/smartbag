const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Brand = require('./models/Brand');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blinkit_clone';

const sampleProducts = [
  {
    name: "Fresh Bananas",
    description: "Organic yellow bananas, perfect for smoothies and snacks",
    price: 49,
    images: ["/uploads/bananas.jpg"],
    category: "68672888d2d738c95ac49592", // Groceries
    brand: "686afa8b4fe291cebea1dbea", // Real fruit
    stock: 100,
    unit: "kg"
  },
  {
    name: "Coca Cola",
    description: "Classic Coca Cola soft drink, 2L bottle",
    price: 85,
    images: ["/uploads/coca-cola.jpg"],
    category: "6867288dd2d738c95ac49594", // Beverages
    brand: "6867289ad2d738c95ac4959a", // Coca-Cola
    stock: 50,
    unit: "bottle"
  },
  {
    name: "Lay's Potato Chips",
    description: "Crunchy potato chips, classic salted flavor",
    price: 20,
    images: ["/uploads/lays-chips.jpg"],
    category: "68672891d2d738c95ac49596", // Snacks
    brand: "68672e8ed2d738c95ac495a0", // Lay's
    stock: 200,
    unit: "pack"
  },
  {
    name: "Fresh Tomatoes",
    description: "Red ripe tomatoes, perfect for cooking",
    price: 40,
    images: ["/uploads/tomatoes.jpg"],
    category: "6869c796e6b5a30bdf86b1a4", // Vegetables
    brand: "686afa8b4fe291cebea1dbea", // Real fruit
    stock: 75,
    unit: "kg"
  },
  {
    name: "Pepsi",
    description: "Refreshing Pepsi cola, 1L bottle",
    price: 45,
    images: ["/uploads/pepsi.jpg"],
    category: "6867288dd2d738c95ac49594", // Beverages
    brand: "6867289ad2d738c95ac4959a", // Coca-Cola (using same brand for demo)
    stock: 60,
    unit: "bottle"
  },
  {
    name: "Doritos Nacho Cheese",
    description: "Tortilla chips with nacho cheese flavor",
    price: 30,
    images: ["/uploads/doritos.jpg"],
    category: "68672891d2d738c95ac49596", // Snacks
    brand: "68672e8ed2d738c95ac495a0", // Lay's (using same brand for demo)
    stock: 150,
    unit: "pack"
  },
  {
    name: "Fresh Onions",
    description: "White onions, essential cooking ingredient",
    price: 35,
    images: ["/uploads/onions.jpg"],
    category: "6869c796e6b5a30bdf86b1a4", // Vegetables
    brand: "686afa8b4fe291cebea1dbea", // Real fruit
    stock: 80,
    unit: "kg"
  },
  {
    name: "Sprite",
    description: "Clear lemon-lime soft drink, 1L bottle",
    price: 40,
    images: ["/uploads/sprite.jpg"],
    category: "6867288dd2d738c95ac49594", // Beverages
    brand: "6867289ad2d738c95ac4959a", // Coca-Cola
    stock: 45,
    unit: "bottle"
  },
  {
    name: "Pringles Original",
    description: "Stackable potato chips, original flavor",
    price: 25,
    images: ["/uploads/pringles.jpg"],
    category: "68672891d2d738c95ac49596", // Snacks
    brand: "68672e8ed2d738c95ac495a0", // Lay's
    stock: 100,
    unit: "can"
  },
  {
    name: "Fresh Potatoes",
    description: "Fresh potatoes, perfect for various dishes",
    price: 30,
    images: ["/uploads/potatoes.jpg"],
    category: "6869c796e6b5a30bdf86b1a4", // Vegetables
    brand: "686afa8b4fe291cebea1dbea", // Real fruit
    stock: 120,
    unit: "kg"
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${insertedProducts.length} products`);

    // Display the inserted products
    console.log('\nInserted Products:');
    insertedProducts.forEach(product => {
      console.log(`- ${product.name}: ₹${product.price}`);
    });

    console.log('\nDatabase seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedProducts(); 