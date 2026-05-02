const mongoose = require("mongoose");

const WarnThresholdSchema = new mongoose.Schema({
  count: { type: Number, required: true },
  action: { type: String, enum: ["timeout", "ban"], required: true },
  duration: { type: Number, default: null }, // ms, required if action is timeout
}, { _id: false });

const ModerationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modLogChannelId: { type: String, default: null },
  appealChannelId: { type: String, default: null },
  warnThresholds: {
    type: [WarnThresholdSchema],
    default: [
      { count: 3, action: "timeout", duration: 3600000 },  // 1 hour
      { count: 5, action: "timeout", duration: 86400000 }, // 24 hours
      { count: 7, action: "ban", duration: null },
    ],
  },
});

module.exports = mongoose.model("ModerationConfig", ModerationConfigSchema);
