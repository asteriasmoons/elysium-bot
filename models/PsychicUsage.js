const mongoose = require("mongoose");

const psychicUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  cooldownUntil: { type: Date, default: null },
});

module.exports = mongoose.model("PsychicUsage", psychicUsageSchema);
