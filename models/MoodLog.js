const { Schema, model } = require("mongoose");

const MoodLogSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, index: true, default: null }, // To know if logged via DM or a specific server context (optional)
  timestamp: { type: Date, default: Date.now, index: true },
  moods: [{ type: String, required: true }], // Array of strings from your predefined list
  activities: [{ type: String, required: true }], // Array of strings
  note: { type: String, default: null }, // Optional text note
});
module.exports = model("MoodLog", MoodLogSchema);
