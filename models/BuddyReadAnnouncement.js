const mongoose = require("mongoose");

const BuddyReadAnnouncementSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    book: { type: String, required: true },
    audience: { type: String, required: true },
    note: { type: String },
    serverId: { type: String }, // optional, for tracking where used
    status: { type: String, enum: ["open", "paired"], default: "open" }, // <-- ADDED STATUS FIELD
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
); // <-- ENSURE createdAt exists
module.exports = mongoose.model(
  "BuddyReadAnnouncement",
  BuddyReadAnnouncementSchema
);
