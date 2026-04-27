// models/Reminder.js
const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["guild", "dm"],
      required: true,
      default: "guild",
    },

    guildId: { type: String, default: null },
    channelId: { type: String, default: null },
    userId: { type: String, default: null },

    name: { type: String, required: true },
    creatorId: { type: String, required: true },
    interval: { type: String, required: true },
    startDate: { type: Date, required: true },
    ping: { type: String, default: "" },
    dayOfWeek: { type: String, default: null },

    embedTitle: { type: String, default: "Reminder!" },
    embedDescription: { type: String, default: "" },
    embedColor: { type: String, default: "#8757f2" },

    timezone: { type: String, default: "America/Chicago" },
    lastSent: { type: Date, default: null },
  },
  { timestamps: true }
);

ReminderSchema.pre("validate", function (next) {
  if (this.type === "guild") {
    if (!this.guildId) {
      return next(new Error("Guild reminders require guildId."));
    }

    if (!this.channelId) {
      return next(new Error("Guild reminders require channelId."));
    }

    this.userId = null;
    return next();
  }

  if (this.type === "dm") {
    if (!this.userId) {
      return next(new Error("DM reminders require userId."));
    }

    this.guildId = null;
    this.channelId = null;
    this.ping = "";
    return next();
  }

  return next(new Error("Reminder type must be guild or dm."));
});

ReminderSchema.index(
  { guildId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "guild", guildId: { $type: "string" } },
  }
);

ReminderSchema.index(
  { userId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "dm", userId: { $type: "string" } },
  }
);

module.exports = mongoose.model("Reminder", ReminderSchema);