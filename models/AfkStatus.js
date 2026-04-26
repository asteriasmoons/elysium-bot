const mongoose = require("mongoose");

/**
 * Stores individual AFK statuses per user, per server.
 */
const afkStatusSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  since: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AfkStatus", afkStatusSchema);
