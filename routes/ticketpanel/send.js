const express = require("express");
const router = express.Router();

const TicketPanel = require("../../models/TicketPanel");
const { sendTicketPanel } = require("../../utils/sendTicketPanel");

/**
 * POST /api/ticketpanel/send
 * Body:
 * {
 *   guildId: string,
 *   channelId: string,
 *   message?: string,
 *   panel: { ... } // full panel object from dashboard
 * }
 */
router.post("/send", async (req, res) => {
  try {
    const { guildId, channelId, message, panel } = req.body;

    if (!guildId || !channelId || !panel) {
      return res.status(400).json({
        error: "Missing guildId, channelId, or panel",
      });
    }

    const client = req.app.get("discordClient");

    if (!client) {
      return res.status(500).json({
        error: "Bot client not found",
      });
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return res.status(404).json({
        error: "Guild not found",
      });
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Invalid channel",
      });
    }

    // Optional message above panel
    if (message) {
      await channel.send({ content: message });
    }

    // 🔥 Use your shared helper
    await sendTicketPanel({ panel, channel });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to send panel",
    });
  }
});

module.exports = router;
