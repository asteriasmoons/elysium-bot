// models/BookInventory.js
const mongoose = require("mongoose");

const BookInventorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  goodreads: {
    type: String,
    required: true,
    trim: true,
  },
  addedBy: {
    // Optional: Discord user ID of who added it
    type: String,
    required: false,
  },
  dateAdded: {
    // Optional: When the book was added
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate books (by title & author)
BookInventorySchema.index({ title: 1, author: 1 }, { unique: true });

module.exports = mongoose.model("BookInventory", BookInventorySchema);
