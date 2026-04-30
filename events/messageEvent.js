const {
  EmbedBuilder,
  Events,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

console.log("[DEBUG] messageEvent.js loaded!");

module.exports = (client) => {
  // Helper to get channel/thread/forum context string
  function channelContext(message) {
    if (!message.channel) return '';
    if (message.channel.isThread?.()) {
      // For threads: show parent and thread info
      let str = `**Thread:** <#${message.channel.id}> (${message.channel.name})\n`;
      if (message.channel.parent?.type === ChannelType.GuildForum) {
        str += `**Forum Channel:** <#${message.channel.parentId}> (${message.channel.parent?.name})\n`;
      } else {
        str += `**Parent:** <#${message.channel.parentId}>\n`;
      }
      return str;
    }
    if (message.channel.type === ChannelType.GuildForum) {
      return `**Forum Channel:** <#${message.channel.id}> (${message.channel.name})\n`;
    }
    return '';
  }

  // === Message Deleted ===
  client.on(Events.MessageDelete, async (message) => {
    console.log("[DEBUG] MessageDelete event fired!", message.id);

    // Handle partials
    if (message.partial) {
      try {
        await message.fetch();
        console.log("[DEBUG] Partial message fetched for delete.");
      } catch (err) {
        console.warn("[WARN] Couldn't fetch deleted message details:", err);
        return; // Can't log what we don't know
      }
    }

    if (!message.guild) return;

    const config = await LogConfig.findOne({ guildId: message.guild.id });
    if (!config?.logs?.messageDelete) return;

    const logChannel = message.guild.channels.cache.get(config.logs.messageDelete);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages))
      return;

    let description = "";
    if (message.content) {
      description += `**Content:**\n${message.content}\n`;
    }
    if (message.embeds?.length > 0) {
      description += `**Embeds:**\n${message.embeds
        .map((embed, i) =>
          `[Embed ${i + 1}] ${embed.title || "No Title"} - ${embed.description || "No Description"}`
        ).join("\n")}\n`;
    }
    if (message.attachments?.size > 0) {
      description += `**Attachments:**\n${[...message.attachments.values()].map(att => att.url).join("\n")}\n`;
    }
    if (!description) description = "*No Content, Embeds, or Attachments.*";

    // Thread/forum info
    const isThread = message.channel?.isThread?.();
    const isForumThread = isThread && message.channel.parent?.type === ChannelType.GuildForum;
    const threadForumInfo = channelContext(message);

    // Use parent channel mention if thread, otherwise regular
    const channelMention = isThread
      ? `<#${message.channel.parentId}> (thread: <#${message.channel.id}>)`
      : `<#${message.channel?.id}>`;

    const embed = new EmbedBuilder()
      .setTitle("Message Deleted")
      .setColor(0xff34cd)
      .setDescription(
        `**Author:** ${message.author?.tag || "Unknown"} (${message.author?.id || "Unknown"})\n` +
        `**Channel:** ${channelMention}\n` +
        threadForumInfo +
        description
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // === Message Edited ===
  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    console.log("[DEBUG] MessageUpdate event fired!", oldMessage.id);

    // Handle partials for both
    if (oldMessage.partial) {
      try { await oldMessage.fetch(); } catch (e) {}
    }
    if (newMessage.partial) {
      try { await newMessage.fetch(); } catch (e) {}
    }
    if (!oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const config = await LogConfig.findOne({ guildId: oldMessage.guild.id });
    if (!config?.logs?.messageEdit) return;

    const logChannel = oldMessage.guild.channels.cache.get(config.logs.messageEdit);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages))
      return;

    const isThread = newMessage.channel?.isThread?.();
    const isForumThread = isThread && newMessage.channel.parent?.type === ChannelType.GuildForum;
    const threadForumInfo = channelContext(newMessage);

    const channelMention = isThread
      ? `<#${newMessage.channel.parentId}> (thread: <#${newMessage.channel.id}>)`
      : `<#${newMessage.channel?.id}>`;

    const embed = new EmbedBuilder()
      .setTitle("Message Edited")
      .setColor(0xff34cd)
      .setDescription(
        `**Author:** ${newMessage.author?.tag || "Unknown"} (${newMessage.author?.id || "Unknown"})\n` +
        `**Channel:** ${channelMention}\n` +
        threadForumInfo
      )
      .addFields(
        {
          name: "Before",
          value: oldMessage.content?.slice(0, 1024) || "*No content*",
        },
        {
          name: "After",
          value: newMessage.content?.slice(0, 1024) || "*No content*",
        }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });

  // === Bulk Delete ===
  client.on(Events.MessageBulkDelete, async (messages) => {
    console.log("[DEBUG] MessageBulkDelete event fired!");

    const first = messages.first();
    if (!first?.guild) return;

    const config = await LogConfig.findOne({ guildId: first.guild.id });
    if (!config?.logs?.bulkDelete) return;

    const logChannel = first.guild.channels.cache.get(config.logs.bulkDelete);
    if (!logChannel?.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages))
      return;

    const isThread = first.channel?.isThread?.();
    const isForumThread = isThread && first.channel.parent?.type === ChannelType.GuildForum;
    const threadForumInfo = channelContext(first);

    const channelMention = isThread
      ? `<#${first.channel.parentId}> (thread: <#${first.channel.id}>)`
      : `<#${first.channel?.id}>`;

    const contentPreview = [...messages.values()]
      .slice(0, 10)
      .map(
        (m) => `${m.author?.tag ?? "Unknown"}: ${m.content ?? "[No content]"}`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Bulk Message Delete")
      .setColor(0xff34cd)
      .setDescription(
        `**Messages Deleted:** ${messages.size}\n` +
        `**Channel:** ${channelMention}\n` +
        threadForumInfo +
        `**Sample:**\n\`\`\`\n${contentPreview}\n\`\`\``
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
  });
};