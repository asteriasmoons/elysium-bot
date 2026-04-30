const mongoose = require("mongoose");

const autoReactSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  emojis: { type: [String], required: true }, // Unicode or custom emoji
});

autoReactSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model("AutoReact", autoReactSchema);