// models/MoodReminderSetting.js
const { Schema, model } = require("mongoose");

const MoodReminderSettingSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true }, // Unique per user
  isEnabled: { type: Boolean, default: false },
  hour: { type: Number },
  minute: { type: Number },
  frequency: { type: String, enum: ["daily", "weekly"] },
  timezone: { type: String, default: "America/Chicago" },
  // lastDmSent: { type: Date }, // To help calculate next weekly if needed
});

module.exports = model("MoodReminderSetting", MoodReminderSettingSchema);
