const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  sprintPingRoleId: { type: String }, // Role to ping for sprints
});

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
