const mongoose = require("mongoose");

const StarboardConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  emoji: { type: String, required: true }, // Unicode or custom emoji string
  threshold: { type: Number, default: 3 },
  enabled: { type: Boolean, default: true },
});

module.exports = mongoose.model("StarboardConfig", StarboardConfigSchema);
