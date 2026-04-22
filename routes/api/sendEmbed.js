const express = require("express");
const { ChannelType } = require("discord.js");

const router = express.Router();

router.post("/send-embed", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const expected = `Bearer ${process.env.BOT_API_KEY}`;

    if (authHeader !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { guildId, channelId, embed, content } = req.body ?? {};

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

    // --- NORMAL TEXT CHANNEL ---
    if (channel.isTextBased && channel.isTextBased() && channel.type !== ChannelType.GuildForum) {
      await channel.send({
        content: content || undefined,
        embeds: [embed],
      });

      return res.json({ success: true });
    }

    // --- FORUM CHANNEL ---
    if (channel.type === ChannelType.GuildForum) {
      const thread = await channel.threads.create({
        name: embed.title || "New Post",
        message: {
          content: content || undefined,
          embeds: [embed],
        },
      });

      return res.json({
        success: true,
        threadId: thread.id,
      });
    }

    return res.status(400).json({
      error: "Unsupported channel type",
    });
  } catch (error) {
    console.error("send-embed route error:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to send embed",
    });
  }
});

module.exports = router;
