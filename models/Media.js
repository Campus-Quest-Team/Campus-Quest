const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questId: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadTimestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', mediaSchema);