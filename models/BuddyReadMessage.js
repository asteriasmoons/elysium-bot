// models/BuddyReadMessage.js
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuddyReadSession', required: true },
  senderId: { type: String, required: true },
  senderTag: { type: String, required: true },
  content: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('BuddyReadMessage', schema);