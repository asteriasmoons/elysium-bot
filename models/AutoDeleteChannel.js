const mongoose = require('mongoose');

const AutoDeleteChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  delaySeconds: { type: Number, default: 10 }
});

module.exports = mongoose.model('AutoDeleteChannel', AutoDeleteChannelSchema);