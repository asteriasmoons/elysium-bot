const mongoose = require("mongoose");

const AppealEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  caseId: { type: Number, required: true },
  userId: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
  reviewedBy: { type: String, default: null },
  reviewNote: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

AppealEntrySchema.index({ guildId: 1, caseId: 1, userId: 1 });

module.exports = mongoose.model("AppealEntry", AppealEntrySchema);
