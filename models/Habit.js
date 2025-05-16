const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: String, required: true },     
  name: { type: String, required: true },        
  description: { type: String },               
  frequency: { type: String, enum: ['daily', 'weekly'], required: true },
  hour: { type: Number, min: 0, max: 23, required: true },
  minute: { type: Number, min: 0, max: 59, required: true },
  timezone: { type: String, defaut: 'America/Chicago' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Habit', habitSchema);