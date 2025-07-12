const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  icon: {
    type: String,
    default: null, // URL to the uploaded icon image
  },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema); 