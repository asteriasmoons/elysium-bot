const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  hour: { type: Number, required: true },
  minute: { type: Number, required: true },
  text: { type: String, default: 'This is your reminder!' },
  zone: { type: String, default: 'UTC' }
});

module.exports = mongoose.model('Reminder', ReminderSchema);