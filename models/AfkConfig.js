const mongoose = require("mongoose");

/**
 * Stores per-guild AFK configuration (e.g. auto-clear setting).
 */
const afkConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  noMessageReset: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("AfkConfig", afkConfigSchema);
