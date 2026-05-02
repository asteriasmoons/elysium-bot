const mongoose = require("mongoose");

const ModerationCaseSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  caseId: { type: Number, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  type: {
    type: String,
    enum: ["ban", "unban", "kick", "timeout", "untimeout", "warn", "note"],
    required: true,
  },
  reason: { type: String, default: "No reason provided" },
  duration: { type: Number, default: null }, // ms, for timeout/tempban
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

ModerationCaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
ModerationCaseSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model("ModerationCase", ModerationCaseSchema);
