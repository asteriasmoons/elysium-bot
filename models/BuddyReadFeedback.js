// models/BuddyReadFeedback.js
const mongoose = require('mongoose');

const buddyReadFeedbackSchema = new mongoose.Schema({
  sessionId: String,
  fromUser: String, // userId
  toUser: String, // userId
  feedback: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuddyReadFeedback', buddyReadFeedbackSchema);