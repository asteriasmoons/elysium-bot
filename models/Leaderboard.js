// models/Leaderboard.js
const { Schema, model } = require('mongoose');

// Use capital L, capital S here
const LeaderboardSchema = new Schema({
  // REMOVE unique: true from here
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  totalPages: { type: Number, default: 0 }
});

// Make the combination of userId and guildId unique
// Use the SAME variable name as above: LeaderboardSchema
LeaderboardSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Use capital L, capital S here too when exporting
module.exports = model('Leaderboard', LeaderboardSchema);