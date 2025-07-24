const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, index: true }, // <-- Still guild specific but also allows for DM reminders
  hour: { type: Number, required: true },
  minute: { type: Number, required: true },
  text: { type: String, default: "This is your reminder!" },
  zone: { type: String, default: "America/Chicago" },
  reminderSentAt: { type: Date, default: null },
});

module.exports =
  mongoose.models.Reminder || mongoose.model("Reminder", ReminderSchema);
