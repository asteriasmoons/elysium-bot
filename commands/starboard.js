// commands/starboard.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const StarboardConfig = require("../models/StarboardConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure and manage the server's Starboard feature.")
    .addSubcommand((sub) =>
      sub
        .setName("set-emoji")
        .setDescription("Set the emoji for Starboard")
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription(
              "Emoji to use (Unicode or custom, e.g., ⭐ or <:myemoji:1234567890>)"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Set the Starboard channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to post starred messages in")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-threshold")
        .setDescription("Set the number of reactions needed")
        .addIntegerOption((opt) =>
          opt
            .setName("number")
            .setDescription("How many reactions before starring")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("enable").setDescription("Enable Starboard")
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Disable Starboard")
    ),

  async execute(interaction) {
    // ==== PERMISSION CHECK ====
    // Replace 'ManageMessages' with your needed permission
    if (!interaction.member.permissions.has("ManageMessages")) {
      const embed = new EmbedBuilder()
        .setColor(0x663399)
        .setTitle("Insufficient Permissions")
        .setDescription(
          "You need the `Manage Messages` permission to use this command."
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } // ============================

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let config = await StarboardConfig.findOne({ guildId });
    if (!config) {
      config = new StarboardConfig({
        guildId,
        channelId: "none",
        emoji: "⭐",
        threshold: 3,
        enabled: false,
      });
    }

    // SET EMOJI
    if (sub === "set-emoji") {
      const emoji = interaction.options.getString("emoji");

      config.emoji = emoji;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Starboard Emoji Set")
            .setDescription(`Starboard emoji set to ${emoji}`)
            .setColor(0x663399),
        ],
      });
    }

    // SET CHANNEL
    if (sub === "set-channel") {
      const channel = interaction.options.getChannel("channel");

      config.channelId = channel.id;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Starboard Channel Set")
            .setDescription(`Starboard messages will be posted in ${channel}`)
            .setColor(0x663399),
        ],
      });
    }

    // SET THRESHOLD
    if (sub === "set-threshold") {
      const number = interaction.options.getInteger("number");

      config.threshold = number;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Starboard Threshold Set")
            .setDescription(
              `Messages now require **${number}** ${config.emoji} to star.`
            )
            .setColor(0x663399),
        ],
      });
    }

    // ENABLE
    if (sub === "enable") {
      config.enabled = true;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Starboard Enabled")
            .setDescription("Starboard is now enabled! ⭐")
            .setColor(0x663399),
        ],
      });
    }

    // DISABLE
    if (sub === "disable") {
      config.enabled = false;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Starboard Disabled")
            .setDescription("Starboard has been disabled.")
            .setColor(0x663399),
        ],
      });
    }
  },
};
