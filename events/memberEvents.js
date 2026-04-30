const { EmbedBuilder, Events } = require("discord.js");
const LogConfig = require("../models/LogConfig"); // adjust path if needed

module.exports = (client) => {
  // Member joins
  client.on(Events.GuildMemberAdd, async (member) => {
    const joinedDiscord = `<t:${Math.floor(
      member.user.createdTimestamp / 1000
    )}:D>`;
    const config = await LogConfig.findOne({ guildId: member.guild.id });
    if (!config?.logs?.memberJoin) return;
    const logChannel = member.guild.channels.cache.get(config.logs.memberJoin);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x8757f2)
      .setTitle(`${member.user.tag} joined the server`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "User", value: `<@${member.id}>`, inline: true },
        { name: "Account Creation", value: joinedDiscord, inline: true },
        { name: "ID", value: member.id, inline: false }
      )
      .setFooter({ text: member.guild.name })
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // Member leaves
  client.on(Events.GuildMemberRemove, async (member) => {
    const config = await LogConfig.findOne({ guildId: member.guild.id });
    if (!config?.logs?.memberLeave) return;
    const logChannel = member.guild.channels.cache.get(config.logs.memberLeave);
    if (!logChannel) return;

    // Discord join date & roles in the guild
    const joinedDiscord = `<t:${Math.floor(
      member.user.createdTimestamp / 1000
    )}:D>`;
    const roles =
      member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .map((r) => `<@&${r.id}>`)
        .join(", ") || "None";

    const embed = new EmbedBuilder()
      .setColor(0x8757f2)
      .setTitle(`${member.user.tag} left server`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "User", value: `<@${member.id}>`, inline: true },
        { name: "Account Creation", value: joinedDiscord, inline: true },
        { name: "Roles", value: roles, inline: false }
      )
      .setFooter({ text: member.guild.name })
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // Role or nickname updated
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const config = await LogConfig.findOne({ guildId: newMember.guild.id });
    if (!config?.logs?.roleUpdate && !config?.logs?.nicknameChange) return;

    // Choose log channel for role/nickname updates
    let logChannel;
    if (config.logs.roleUpdate) {
      logChannel = newMember.guild.channels.cache.get(config.logs.roleUpdate);
    } else if (config.logs.nicknameChange) {
      logChannel = newMember.guild.channels.cache.get(
        config.logs.nicknameChange
      );
    }
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));

    // Nickname changed
    if (
      oldMember.nickname !== newMember.nickname &&
      config.logs.nicknameChange
    ) {
      embed
        .setColor(0x8757f2)
        .setTitle("Nickname Changed")
        .addFields(
          { name: "User", value: `${newMember.user.tag} (${newMember.id})` },
          { name: "Before", value: oldMember.nickname || "None", inline: true },
          { name: "After", value: newMember.nickname || "None", inline: true }
        );

      logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // Roles changed
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    const addedRoles = [...newRoles].filter((id) => !oldRoles.has(id));
    const removedRoles = [...oldRoles].filter((id) => !newRoles.has(id));

    if (
      (addedRoles.length > 0 || removedRoles.length > 0) &&
      config.logs.roleUpdate
    ) {
      embed
        .setColor(0x8757f2)
        .setTitle("Roles Updated")
        .setDescription(
          `${newMember.user.tag} (${newMember.id}) had their roles changed.`
        );

      // Build only valid fields
      const fields = [];
      if (addedRoles.length > 0) {
        fields.push({
          name: "Added",
          value: addedRoles.map((id) => `<@&${id}>`).join(", "),
          inline: true,
        });
      }
      if (removedRoles.length > 0) {
        fields.push({
          name: "Removed",
          value: removedRoles.map((id) => `<@&${id}>`).join(", "),
          inline: true,
        });
      }
      if (fields.length > 0) {
        embed.addFields(...fields);
      }

      logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  });

  // Username or avatar changed (UserUpdate is a global event)
  client.on(Events.UserUpdate, async (oldUser, newUser) => {
    // For each guild, log if this user is a member
    client.guilds.cache.forEach(async (guild) => {
      const member = await guild.members.fetch(newUser.id).catch(() => null);
      if (!member) return;

      const config = await LogConfig.findOne({ guildId: guild.id });
      if (!config?.logs?.usernameChange && !config?.logs?.avatarChange) return;

      // Pick the correct log channel
      let logChannel;
      if (config.logs.usernameChange) {
        logChannel = guild.channels.cache.get(config.logs.usernameChange);
      } else if (config.logs.avatarChange) {
        logChannel = guild.channels.cache.get(config.logs.avatarChange);
      }
      if (!logChannel) return;

      const embed = new EmbedBuilder().setTimestamp();

      if (oldUser.username !== newUser.username && config.logs.usernameChange) {
        embed
          .setColor(0x8757f2)
          .setTitle("Username Changed")
          .setDescription(
            `**Before:** ${oldUser.username}\n**After:** ${newUser.username}`
          )
          .setThumbnail(newUser.displayAvatarURL({ dynamic: true }));

        logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      if (
        oldUser.displayAvatarURL() !== newUser.displayAvatarURL() &&
        config.logs.avatarChange
      ) {
        embed
          .setColor(0x8757f2)
          .setTitle("Avatar Changed")
          .setDescription(`${newUser.tag} updated their avatar.`)
          .setImage(newUser.displayAvatarURL({ dynamic: true }));

        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    });
  });
};
