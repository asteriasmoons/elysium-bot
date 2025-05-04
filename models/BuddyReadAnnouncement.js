const mongoose = require('mongoose');

const BuddyReadAnnouncementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  book: { type: String, required: true },
  audience: { type: String, required: true },
  note: { type: String },
  serverId: { type: String }, // optional, for tracking where used
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuddyReadAnnouncement', BuddyReadAnnouncementSchema);