const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true }, // <-- Add this!
  hour: { type: Number, required: true },
  minute: { type: Number, required: true },
  text: { type: String, default: 'This is your reminder!' },
  zone: { type: String, default: 'America/Chicago' }
});

module.exports = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);