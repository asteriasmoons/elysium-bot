const mongoose = require('mongoose');

const HabitConfigSchema = new mongoose.Schema({
	guildId: { type: String, required: true, unique: true },
	channelIds: { type: [String], default: [] }
});

module.exports = mongoose.models.HabitConfig || mongoose.model('HabitConfig', 
HabitConfigSchema);