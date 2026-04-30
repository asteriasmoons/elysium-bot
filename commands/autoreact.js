const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const AutoReact = require("../models/AutoReact");

// ===== Emoji Helper Functions =====
function isCustomEmoji(str) {
  // Matches <:name:id> or <a:name:id>
  return /^<a?:\w+:\d+>$/.test(str);
}

function isUnicodeEmoji(str) {
  // Checks if string is (or contains) a Unicode emoji. This covers most emojis.
  return /[\p{Emoji_Presentation}\u200d]+/u.test(str);
}

function validateEmojis(emojis) {
  // Must be 2-6, unique, each must be a valid Unicode or custom emoji.
  if (emojis.length < 2 || emojis.length > 6) return false;
  const unique = new Set(emojis);
  if (unique.size !== emojis.length) return false;
  for (const emoji of emojis) {
    if (!(isUnicodeEmoji(emoji) || isCustomEmoji(emoji))) return false;
  }
  return true;
}

function parseEmojis(options) {
  return [
    options.getString("emoji1"),
    options.getString("emoji2"),
    options.getString("emoji3"),
    options.getString("emoji4"),
    options.getString("emoji5"),
    options.getString("emoji6"),
  ].filter(Boolean);
}
// ==================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoreact")
    .setDescription("Automatic emoji reactions for a channel")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set auto-reactions for a channel")
        .addChannelOption(opt => opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(opt => opt.setName("emoji1").setDescription("Emoji 1").setRequired(true))
        .addStringOption(opt => opt.setName("emoji2").setDescription("Emoji 2").setRequired(true))
        .addStringOption(opt => opt.setName("emoji3").setDescription("Emoji 3").setRequired(false))
        .addStringOption(opt => opt.setName("emoji4").setDescription("Emoji 4").setRequired(false))
        .addStringOption(opt => opt.setName("emoji5").setDescription("Emoji 5").setRequired(false))
        .addStringOption(opt => opt.setName("emoji6").setDescription("Emoji 6").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("edit")
        .setDescription("Edit auto-reactions for a channel")
        .addChannelOption(opt => opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(opt => opt.setName("emoji1").setDescription("Emoji 1").setRequired(true))
        .addStringOption(opt => opt.setName("emoji2").setDescription("Emoji 2").setRequired(true))
        .addStringOption(opt => opt.setName("emoji3").setDescription("Emoji 3").setRequired(false))
        .addStringOption(opt => opt.setName("emoji4").setDescription("Emoji 4").setRequired(false))
        .addStringOption(opt => opt.setName("emoji5").setDescription("Emoji 5").setRequired(false))
        .addStringOption(opt => opt.setName("emoji6").setDescription("Emoji 6").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove auto-reactions from a channel")
        .addChannelOption(opt => opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("List all channels with auto-reactions")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ===== SET & EDIT SUBCOMMANDS =====
    if (sub === "set" || sub === "edit") {
      const channel = interaction.options.getChannel("channel");
      const emojis = parseEmojis(interaction.options);

      if (!validateEmojis(emojis)) {
        const errEmbed = new EmbedBuilder()
          .setTitle("Invalid Emoji Input")
          .setDescription(
            "Please provide **2-6 unique emojis** (Unicode or custom) using Discord's emoji picker.\n\n" +
            "Custom emojis must be from this server or a server the bot shares."
          )
          .setColor("#ff5555");
        return interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }

      await AutoReact.findOneAndUpdate(
        { guildId, channelId: channel.id },
        { emojis },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setTitle("Auto-Reactions Set")
        .setDescription(
          `I will now react to every message in ${channel} with:\n${emojis.join(" ")}`
        )
        .setColor("#F9A602");
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // ===== REMOVE SUBCOMMAND =====
    if (sub === "remove") {
      const channel = interaction.options.getChannel("channel");
      const config = await AutoReact.findOneAndDelete({ guildId, channelId: channel.id });

      const embed = new EmbedBuilder()
        .setTitle("Auto-Reactions Removed")
        .setDescription(config
          ? `Auto-reactions have been **removed** from ${channel}.`
          : `No auto-reactions were set for ${channel}.`)
        .setColor(config ? "#F9A602" : "#ff5555");
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // ===== LIST SUBCOMMAND =====
    if (sub === "list") {
      const configs = await AutoReact.find({ guildId });

      if (!configs.length) {
        const embed = new EmbedBuilder()
          .setTitle("No Auto-Reactions Configured")
          .setDescription("No channels currently have auto-reactions set in this server.")
          .setColor("#ff5555");
        return interaction.reply({ embeds: [embed], ephemeral: false });
      }

      const embed = new EmbedBuilder()
        .setTitle("Auto-Reactions Configured")
        .setDescription(
          configs
            .map(conf => `<#${conf.channelId}>: ${conf.emojis.join(" ")}`)
            .join("\n")
        )
        .setColor("#F9A602");

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  },
};