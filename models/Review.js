const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  book: { type: String, required: true },
  author: { type: String, required: true },
  review: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  timestamp: { type: Date, default: Date.now }
});

module.exports = model('Review', ReviewSchema);