const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  currentRead: { type: String, default: '' },
  booksRead: { type: Number, default: 0 },
  favoriteGenre: { type: String, default: '' },
  readingGoal: { type: String, default: 0 },
  preferredFormat: { type: String, default: '' },
  favoriteAuthor: { type: String, default: '' },
  memberSince: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Profile', profileSchema);