const express = require("express");

const router = express.Router();

router.get("/guilds/:guildId/roles", async (req, res) => {
  try {

    const guildId = String(req.params.guildId || "").trim();

    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    const client = req.app.get("discordClient");

    if (!client) {
      return res.status(500).json({ error: "Discord client not available" });
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    const roles = await guild.roles.fetch();

    const guildRoles = Array.from(roles.values())
      .filter((role) => {
        if (!role) return false;
        if (role.managed) return false;
        if (role.name === "@everyone") return false;
        return true;
      })
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position);

    return res.json({ roles: guildRoles });
  } catch (error) {
    console.error("guild roles route error:", error);

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to load guild roles",
    });
  }
});

module.exports = router;
