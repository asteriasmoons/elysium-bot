const { EmbedBuilder, Events, PermissionsBitField } = require("discord.js");
const LogConfig = require("../models/LogConfig"); // Adjust path if needed

module.exports = (client) => {
  // Role Created
  client.on(Events.GuildRoleCreate, async (role) => {
    const config = await LogConfig.findOne({ guildId: role.guild.id });
    if (!config?.logs?.roleCreate) return;

    const logChannel = role.guild.channels.cache.get(config.logs.roleCreate);
    if (
      !logChannel
        ?.permissionsFor(client.user)
        ?.has(PermissionsBitField.Flags.SendMessages)
    )
      return;

    const embed = new EmbedBuilder()
      .setColor(0xff34cd)
      .setTitle("Role Created")
      .addFields(
        { name: "Name", value: role.name, inline: true },
        { name: "Color", value: role.hexColor, inline: true },
        { name: "Role", value: `<@&${role.id}>`, inline: false },
        { name: "Role ID", value: `${role.id}`, inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // Role Deleted
  client.on(Events.GuildRoleDelete, async (role) => {
    const config = await LogConfig.findOne({ guildId: role.guild.id });
    if (!config?.logs?.roleDelete) return;

    const logChannel = role.guild.channels.cache.get(config.logs.roleDelete);
    if (
      !logChannel
        ?.permissionsFor(client.user)
        ?.has(PermissionsBitField.Flags.SendMessages)
    )
      return;

    const embed = new EmbedBuilder()
      .setColor(0xff34cd)
      .setTitle("Role Deleted")
      .addFields(
        { name: "Name", value: role.name, inline: true },
        { name: "Color", value: role.hexColor, inline: true },
        { name: "Role", value: `<@&${role.id}>`, inline: false },
        { name: "Role ID", value: `${role.id}`, inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // Role Updated
  client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    const config = await LogConfig.findOne({ guildId: newRole.guild.id });
    if (!config?.logs?.roleUpdate) return;

    const logChannel = newRole.guild.channels.cache.get(config.logs.roleUpdate);
    if (
      !logChannel
        ?.permissionsFor(client.user)
        ?.has(PermissionsBitField.Flags.SendMessages)
    )
      return;

    const changes = [];

    if (oldRole.name !== newRole.name) {
      changes.push({
        name: "Name Changed",
        value: `**Before:** ${oldRole.name}\n**After:** ${newRole.name}`,
      });
    }
    if (oldRole.color !== newRole.color) {
      changes.push({
        name: "Color Changed",
        value: `**Before:** ${oldRole.hexColor}\n**After:** ${newRole.hexColor}`,
      });
    }
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      changes.push({
        name: "Permissions Changed",
        value: `**Before:** ${
          oldRole.permissions.toArray().join(", ") || "None"
        }\n**After:** ${newRole.permissions.toArray().join(", ") || "None"}`,
      });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0xff34cd)
      .setTitle("Role Updated")
      .addFields(...changes)
      .addFields(
        { name: "Role", value: `<@&${newRole.id}>`, inline: false },
        { name: "Role ID", value: `${newRole.id}`, inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });
};
