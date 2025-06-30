// models/Report.js
const { Schema, model } = require("mongoose");

const reportSchema = new Schema({
  feedbackId: { type: Number, required: true, unique: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  guildId: { type: String },
  guildName: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model("Report", reportSchema);
