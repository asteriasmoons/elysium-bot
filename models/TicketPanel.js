const mongoose = require("mongoose");

const TicketPanelSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    panelName: { type: String, required: true },
    creatorId: { type: String, required: true },

    emoji: { type: String, default: "" },
    greeting: {
      type: String,
      default:
        "Thank you for opening a ticket! A moderator will be with you shortly.",
    },

    roleToPing: { type: String, default: "" },

    postChannelId: { type: String, default: "" },
    ticketCategoryId: { type: String, default: "" },

    transcriptsEnabled: { type: Boolean, default: true },
    transcriptChannelId: { type: String, default: "" }, // <-- for log channel

    embed: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      color: { type: String, default: "#5103aa" },
      author: {
        name: { type: String, default: "" },
        icon_url: { type: String, default: "" },
      },
      footer: {
        text: { type: String, default: "" },
        icon_url: { type: String, default: "" },
        timestamp: { type: Boolean, default: false },
      },
      thumbnail: { type: String, default: "" },
      image: { type: String, default: "" },
    },

    // New field: greetingEmbed
    greetingEmbed: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      color: { type: String, default: "#5103aa" },
      author: {
        name: { type: String, default: "" },
        icon_url: { type: String, default: "" },
      },
      footer: {
        text: { type: String, default: "" },
        icon_url: { type: String, default: "" },
        timestamp: { type: Boolean, default: false },
      },
      thumbnail: { type: String, default: "" },
      image: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

TicketPanelSchema.index({ guildId: 1, panelName: 1 }, { unique: true });

module.exports = mongoose.model("TicketPanel", TicketPanelSchema);
