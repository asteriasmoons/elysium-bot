const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
    userId: String,
    guildId: String, // <-- Add this line!
    hour: Number,
    minute: Number,
    text: String,
    zone: String
});

module.exports = mongoose.model('Reminder', ReminderSchema);