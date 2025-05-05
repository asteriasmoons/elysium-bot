const mongoose = require('mongoose');

const tbrSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  books: [{
    title: { type: String, required: true },
    author: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('TBR', tbrSchema);