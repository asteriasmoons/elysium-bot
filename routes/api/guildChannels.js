const express = require("express");
const { ChannelType } = require("discord.js");

const router = express.Router();

router.get("/guilds/:guildId/channels", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const expected = `Bearer ${process.env.BOT_API_KEY}`;

    if (authHeader !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const guildId = String(req.params.guildId || "").trim();

    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    const client = req.app.get("discordClient");

    if (!client) {
      return res.status(500).json({ error: "Discord client not available" });
    }

    const guild = await client.guilds.fetch({ guild: guildId, force: true }).catch(() => null);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    const channels = await guild.channels.fetch({ force: true });

    const guildChannels = Array.from(channels.values())
      .filter((channel) => {
        if (!channel) return false;

        return [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum,
          ChannelType.GuildCategory,
        ].includes(channel.type);
      })
      .map((channel) => ({
        id: channel.id,
        name: channel.name ?? "unknown-channel",
        type: channel.type,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type - b.type;
        return a.name.localeCompare(b.name);
      });

    return res.json({ channels: guildChannels });
  } catch (error) {
    console.error("guild channels route error:", error);

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to load guild channels",
    });
  }
});

module.exports = router;