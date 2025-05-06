// models/JournalEntry.js
const { Schema, model } = require('mongoose');

const JournalEntrySchema = new Schema({
  userId: { type: String, required: true },
  entry: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('JournalEntry', JournalEntrySchema);