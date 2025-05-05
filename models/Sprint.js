const { Schema, model } = require('mongoose');

const ParticipantSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  startingPages: { type: Number, required: true },
  endingPages: { type: Number }, // Not required until finished
});

const SprintSchema = new Schema({
  guildId: { type: String }, // Null for DMs
  channelId: { type: String }, // Where it was started
  active: { type: Boolean, default: true },
  duration: { type: Number, required: true }, // minutes
  endTime: { type: Date, required: true },
  participants: [ParticipantSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('Sprint', SprintSchema);