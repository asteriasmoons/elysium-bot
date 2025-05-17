const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },  
  habitId: { type: String, required: true }, 
  action: { type: String, enum: ['yes', 'nottoday', 'skip'], required: true },
  timestamp: { type: Date, default: Date.now },
  xp: { type: Number, default: 0 }
});

module.exports = mongoose.model('HabitLog', habitLogSchema);