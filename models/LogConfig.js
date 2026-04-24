const mongoose = require("mongoose");

const LogConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logs: {
    memberJoin: { type: String, default: null },
    memberLeave: { type: String, default: null },
    messageDelete: { type: String, default: null },
    messageEdit: { type: String, default: null },
    bulkDelete: { type: String, default: null },
    roleCreate: { type: String, default: null },
    roleUpdate: { type: String, default: null },
    roleDelete: { type: String, default: null },
    nicknameChange: { type: String, default: null },
    avatarChange: { type: String, default: null },
    channelCreate: { type: String, default: null },
    channelUpdate: { type: String, default: null },
    channelDelete: { type: String, default: null },
    warn: { type: String, default: null },
    timeout: { type: String, default: null },
    ban: { type: String, default: null },
    kick: { type: String, default: null },
  },
});

module.exports = mongoose.model("LogConfig", LogConfigSchema);
