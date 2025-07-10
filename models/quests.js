const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  title: String,
  questDescription: String,
  isCycled: { type: Boolean, default: false },
  // Add other quest fields as needed
}, { timestamps: true });

module.exports = mongoose.model('quests', questSchema);