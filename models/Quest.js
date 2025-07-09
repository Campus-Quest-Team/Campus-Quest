const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  title: String,
  description: String,
  isCycled: { type: Boolean, default: false },
  // Add other quest fields as needed
}, { timestamps: true });

module.exports = mongoose.model('Quest', questSchema);