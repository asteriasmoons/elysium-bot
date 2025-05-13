const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: String, required: true },          // Discord user ID
  name: { type: String, required: true },            // Habit name
  description: { type: String },                     // Optional description
  frequency: { type: String, enum: ['daily', 'weekly'], required: true },
  hour: { type: Number, min: 0, max: 23, required: true },
  minute: { type: Number, min: 0, max: 59, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Habit', habitSchema);