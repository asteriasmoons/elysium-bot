const mongoose = require("mongoose");

const ConfessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  confessionId: { type: Number, required: true },
  content: { type: String, required: true },
  status: { type: String, default: "approved" }, // "approved" | "pending" | "declined"
  createdAt: { type: Date, default: Date.now },
});

ConfessionSchema.index({ guildId: 1, confessionId: 1 }, { unique: true });

module.exports = mongoose.model("Confession", ConfessionSchema);
