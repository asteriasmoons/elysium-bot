const { Schema, model } = require('mongoose');

const LeaderboardSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  totalPages: { type: Number, default: 0 }
});

module.exports = model('Leaderboard', LeaderboardSchema);