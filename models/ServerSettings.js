// In your models folder, e.g., models/ServerSettings.js
const mongoose = require("mongoose");

const serverSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true }, // The ID of the server
  sprintChannelId: { type: String, default: null }, // Field for the sprint channel ID
  giftChannelId: { type: String, default: null }, // Field for the gifts channel ID
  // ... other server-specific settings ...
});

module.exports = mongoose.model("ServerSettings", serverSettingsSchema);
