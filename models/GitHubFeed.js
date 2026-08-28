// models/GitHubFeed.js
const mongoose = require("mongoose");

const GitHubFeedSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  repoUrl: { type: String, required: true },
  displayName: { type: String },
  nameKey: { type: String, index: true },
  branch: { type: String, default: "main" },
  channelId: { type: String, required: true },
  lastCommitSha: { type: String },
  lastIssueId: { type: Number },
  lastReleaseId: { type: Number },
});

GitHubFeedSchema.index({ guildId: 1, nameKey: 1 });

module.exports = mongoose.model("GitHubFeed", GitHubFeedSchema);
