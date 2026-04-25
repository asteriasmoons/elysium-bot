const express = require("express");

const router = express.Router();

const { sendRolePanel } = require("../../utils/sendRolePanel");

router.post("/send", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const expected = `Bearer ${process.env.BOT_API_KEY}`;

    if (authHeader !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { guildId, channelId, panel } = req.body;

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

    const sentMessage = await sendRolePanel({ panel, channel });

    return res.json({
      success: true,
      messageId: sentMessage.id,
      channelId: sentMessage.channelId,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to send role panel",
    });
  }
});

module.exports = router;
