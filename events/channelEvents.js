const {
  EmbedBuilder,
  ChannelType,
  Events,
  PermissionsBitField,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

console.log("[DEBUG] channelEvents.js loaded!");

module.exports = (client) => {
  // Helper for readable channel types
  function channelTypeToString(type) {
    const types = {
      [ChannelType.GuildText]: "Text Channel",
      [ChannelType.GuildVoice]: "Voice Channel",
      [ChannelType.GuildCategory]: "Category",
      [ChannelType.GuildAnnouncement]: "Announcement Channel",
      [ChannelType.AnnouncementThread]: "Announcement Thread",
      [ChannelType.PublicThread]: "Public Thread",
      [ChannelType.PrivateThread]: "Private Thread",
      [ChannelType.GuildStageVoice]: "Stage Channel",
      [ChannelType.GuildForum]: "Forum Channel",
    };
    return types[type] || "Unknown";
  }

  // Channel Created
  client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;

    const config = await LogConfig.findOne({ guildId: channel.guild.id });
    if (!config?.logs?.channelCreate) return;

    const logChannel = channel.guild.channels.cache.get(config.logs.channelCreate);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)) return;

    const embed = new EmbedBuilder()
      .setColor(0x12cdea)
      .setTitle("Channel Created")
      .addFields(
        { name: "Name", value: channel.name, inline: true },
        { name: "ID", value: channel.id, inline: true },
        { name: "Type", value: channelTypeToString(channel.type), inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // Channel Deleted
  client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;

    const config = await LogConfig.findOne({ guildId: channel.guild.id });
    if (!config?.logs?.channelDelete) return;

    const logChannel = channel.guild.channels.cache.get(config.logs.channelDelete);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)) return;

    const embed = new EmbedBuilder()
      .setColor(0x5d47a0)
      .setTitle("Channel Deleted")
      .addFields(
        { name: "Name", value: channel.name, inline: true },
        { name: "ID", value: channel.id, inline: true },
        { name: "Type", value: channelTypeToString(channel.type), inline: true }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // Channel Updated (Enhanced with permission changes)
  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    const config = await LogConfig.findOne({ guildId: newChannel.guild.id });
    if (!config?.logs?.channelUpdate) return;

    const logChannel = newChannel.guild.channels.cache.get(config.logs.channelUpdate);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)) return;

    const changes = [];
    if (oldChannel.name !== newChannel.name) {
      changes.push({
        name: "Name Changed",
        value: `**Before:** ${oldChannel.name}\n**After:** ${newChannel.name}`,
      });
    }

    if ("topic" in oldChannel && oldChannel.topic !== newChannel.topic) {
      changes.push({
        name: "Topic Changed",
        value: `**Before:** ${oldChannel.topic || "None"}\n**After:** ${newChannel.topic || "None"}`,
      });
    }

    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;

    if (!oldPerms.equals(newPerms)) {
      changes.push({
        name: "Permissions Changed",
        value: "Channel permissions were updated.",
      });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0x5d47a0)
      .setTitle("Channel Updated")
      .addFields(...changes, { name: "Channel", value: `<#${newChannel.id}>` })
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // Thread Created
  client.on(Events.ThreadCreate, async (thread) => {
    const config = await LogConfig.findOne({ guildId: thread.guild.id });
    if (!config?.logs?.channelCreate) return;
    const logChannel = thread.guild.channels.cache.get(config.logs.channelCreate);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)) return;

    const embed = new EmbedBuilder()
      .setColor(0x5d47a0)
      .setTitle("Thread Created")
      .addFields(
        { name: "Name", value: thread.name, inline: true },
        { name: "ID", value: thread.id, inline: true },
        { name: "Parent", value: `<#${thread.parentId}>`, inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // Thread Deleted
  client.on(Events.ThreadDelete, async (thread) => {
    const config = await LogConfig.findOne({ guildId: thread.guild.id });
    if (!config?.logs?.channelDelete) return;
    const logChannel = thread.guild.channels.cache.get(config.logs.channelDelete);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)) return;

    const embed = new EmbedBuilder()
      .setColor(0x5d47a0)
      .setTitle("Thread Deleted")
      .addFields(
        { name: "Name", value: thread.name, inline: true },
        { name: "ID", value: thread.id, inline: true },
        { name: "Parent", value: `<#${thread.parentId}>`, inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });
};