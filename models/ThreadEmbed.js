// models/ThreadEmbed.js
const mongoose = require('mongoose');

const ThreadEmbedSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  title: String,
  description: String,
  color: Number
});

module.exports = mongoose.model('ThreadEmbed', ThreadEmbedSchema);