const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },         // Discord user ID
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
  action: { type: String, enum: ['yes', 'nottoday', 'skip'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HabitLog', habitLogSchema);