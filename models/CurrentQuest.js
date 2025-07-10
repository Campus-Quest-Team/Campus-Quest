const mongoose = require('mongoose');

const currentQuestSchema = new mongoose.Schema({
  questId: { type: mongoose.Schema.Types.ObjectId, ref: 'quests', required: true },
  timestamp: { type: Date, default: Date.now },
  questData: Object // Store the full quest data for reference
});

module.exports = mongoose.model('CurrentQuest', currentQuestSchema, 'currentquest');