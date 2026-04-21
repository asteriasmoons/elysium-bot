const express = require("express");

const router = express.Router();

router.post("/send-embed", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const expected = `Bearer ${process.env.BOT_API_KEY}`;

    if (authHeader !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { guildId, channelId, embed } = req.body ?? {};

    if (!guildId || !channelId || !embed) {
      return res.status(400).json({
        error: "Missing guildId, channelId, or embed",
      });
    }

    const client = req.app.get("discordClient");

    if (!client) {
      return res.status(500).json({
        error: "Discord client not available",
      });
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return res.status(404).json({
        error: "Guild not found",
      });
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return res.status(404).json({
        error: "Channel not found",
      });
    }

    if (!channel.isTextBased || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Channel is not text-based",
      });
    }

    await channel.send({
      embeds: [embed],
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("send-embed route error:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to send embed",
    });
  }
});

module.exports = router;
