const mongoose = require('mongoose');

const buddyReadSessionSchema = new mongoose.Schema({
  book: { type: String, required: true },
  book_normalized: { type: String, required: true }, // <--- added
  audience: { type: String, required: true },
  participants: [{
    userId: String,
    username: String
  }],
  serverId: { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['active', 'finished', 'unmatched'], default: 'active' }
});

// Always keep book_normalized in sync
buddyReadSessionSchema.pre('save', function(next) {
  if (this.book) {
    this.book_normalized = this.book.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('BuddyReadSession', buddyReadSessionSchema);