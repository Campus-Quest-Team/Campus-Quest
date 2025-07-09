const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  emailVerified: { type: Boolean, default: false },
  questCompleted: { type: Number, default: 0 },
  mobileDeviceToken: String,
  firstName: String,
  lastName: String,
  profile: {
    displayName: String,
    PFP: String,
    bio: { type: String, default: "Make your bio here" }
  },
  settings: {
    notifications: { type: Boolean, default: true }
  },
  questPosts: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    questId: String,
    userId: String,
    mediaPath: String,
    likes: { type: Number, default: 0 },
    flagged: { type: Number, default: 0 },
    timeStamp: { type: Date, default: Date.now },
    likedBy: [String],
    flaggedBy: [String]
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);