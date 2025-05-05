const mongoose = require('mongoose');

const ReminderConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelIds: { type: [String], default: [] }
});

module.exports = mongoose.models.ReminderConfig || mongoose.model('ReminderConfig', ReminderConfigSchema);