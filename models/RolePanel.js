const mongoose = require("mongoose");
const { Schema } = mongoose;

const RolePanelSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  panelName: { type: String, required: true }, // unique per guild
  channelId: { type: String }, // where it was/will be published
  messageId: { type: String }, // Discord message ID of published panel
  type: { type: String, enum: ["button", "select"], required: true },
  selectMode: { type: String, enum: ["single", "multi"], default: "multi" }, // only for select
  roles: [
    {
      roleId: { type: String, required: true },
      label: { type: String, required: true }, // Display name in menu/button
      emoji: { type: String }, // Custom or unicode emoji
      description: { type: String }, // (optional) For select menu option
      order: { type: Number, default: 0 }, // Optional: for custom ordering
    },
  ],
  // Embed customization fields:
  embedTitle: { type: String, default: "" },
  embedDescription: { type: String, default: "" },
  embedColor: { type: String, default: "#00e6e6" },

  createdAt: { type: Date, default: Date.now },
});

RolePanelSchema.index({ guildId: 1, panelName: 1 }, { unique: true });

module.exports = mongoose.model("RolePanel", RolePanelSchema);
