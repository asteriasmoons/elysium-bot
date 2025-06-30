const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  xp: { type: Number, default: 0 },
  hasUnlimitedJournal: { type: Boolean, default: false },
  // Add other fields as needed
});

module.exports = mongoose.model("User", userSchema);
