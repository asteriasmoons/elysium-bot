const mongoose = require("mongoose");

const ConfessionConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  confessionChannelId: { type: String, required: true },
  embedTitle: { type: String, default: "Confession #{id}" },
  reportChannelId: { type: String, default: null },
});

module.exports = mongoose.model("ConfessionConfig", ConfessionConfigSchema);
