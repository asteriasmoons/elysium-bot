const mongoose = require("mongoose");

const StickyEmbedSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  embed: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: String, default: "#5865F2" },
  },
  // NEW: Array of "active" sticky placements
  stickies: [
    {
      channelId: { type: String, required: true },
      messageId: { type: String },
    },
  ],
});

StickyEmbedSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("StickyEmbed", StickyEmbedSchema);
