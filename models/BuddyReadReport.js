// models/BuddyReadReport.js
const mongoose = require('mongoose');

const buddyReadReportSchema = new mongoose.Schema({
  sessionId: String,
  reportedBy: String, // userId
  reportedUser: String, // userId
  reason: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuddyReadReport', buddyReadReportSchema);