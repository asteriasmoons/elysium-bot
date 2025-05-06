// models/Embed.js
const mongoose = require('mongoose');

const EmbedSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  creatorId: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  color: { type: String, default: '#993377' }, // Discord blurple
  author: {
    name: { type: String, default: '' },
    icon_url: { type: String, default: '' }
  },
  footer: {
    text: { type: String, default: '' },
    icon_url: { type: String, default: '' },
    timestamp: { type: Boolean, default: false }
  },
  thumbnail: { type: String, default: '' },
  image: { type: String, default: '' }
}, { timestamps: true });

EmbedSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Embed', EmbedSchema);