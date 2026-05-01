const mongoose = require("mongoose");

const StarboardEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  originalMessageId: { type: String, required: true },
  starboardMessageId: { type: String, required: true },
});

StarboardEntrySchema.index({ guildId: 1, originalMessageId: 1 }, { unique: true });

module.exports = mongoose.model("StarboardEntry", StarboardEntrySchema);
