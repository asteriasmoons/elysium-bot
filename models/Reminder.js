// models/Reminder.js
const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    creatorId: { type: String, required: true },
    interval: { type: String, required: true }, // e.g., '1h', '12h', '1d'
    startDate: { type: Date, required: true }, // When does the first reminder start?
    ping: { type: String, default: "" }, // Role or user mention, or plain text
    channelId: { type: String, required: true },
    dayOfWeek: { type: String, default: null }, // e.g., 'Monday' (optional)

    // Embed customization
    embedTitle: { type: String, default: "Reminder!" },
    embedDescription: { type: String, default: "" },
    embedColor: { type: String, default: "#8757f2" },

    timezone: { type: String, default: "America/Chicago" }, // <--- NEW FIELD!

    // For scheduling
    lastSent: { type: Date, default: null },
  },
  { timestamps: true }
);

ReminderSchema.index({ guildId: 1, name: 1 }, { unique: true }); // Ensure names are unique per guild

module.exports = mongoose.model("Reminder", ReminderSchema);
