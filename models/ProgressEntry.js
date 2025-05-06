const mongoose = require('mongoose');

const ProgressEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  book: { type: String, required: true },
  progress: { type: String, required: true },
  note: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProgressEntry', ProgressEntrySchema);