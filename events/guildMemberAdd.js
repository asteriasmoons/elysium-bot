const Autorole = require("../models/Autorole");

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    try {
      const data = await Autorole.findOne({ guildId: member.guild.id });
      if (data && Array.isArray(data.roleIds) && data.roleIds.length) {
        for (const roleId of data.roleIds) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) await member.roles.add(role, "Autorole on join");
        }
      }
    } catch (err) {
      console.error(`[autorole] Error assigning roles: ${err}`);
    }
  });
};
