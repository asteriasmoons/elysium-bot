// commands/autothread.js

const {
  SlashCommandBuilder,
  ChannelType,
  ChannelSelectMenuBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const AutoThreadConfig = require("../models/AutoThreadConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autothread")
    .setDescription(
      "Configure and manage automatic thread creation in channels."
    )

    // Subcommand: /autothread channel config (launches channel picker menu)
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription(
          "Set which channels will auto-create threads for every message."
        )
        .addStringOption((opt) =>
          opt
            .setName("config")
            .setDescription(
              "Open the interactive channel select menu (click to continue)"
            )
            .setRequired(true)
            .setChoices({ name: "Open Channel Config Menu", value: "open" })
        )
    )

    // Subcommand: /autothread edit embed <channel> <title> <description> <color>
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription(
          "Edit the embed sent when a thread is auto-created in a specific channel."
        )
        .addStringOption((opt) =>
          opt
            .setName("embed")
            .setDescription("Edit embed for a specific channel")
            .setRequired(true)
            .setChoices({ name: "Edit Embed", value: "edit" })
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to edit the auto-thread embed for")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Embed title").setMaxLength(256)
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Embed description")
            .setMaxLength(4000)
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("Embed color (hex, e.g. #5865F2)")
        )
    )

    // Subcommand: /autothread threadname <channel> <template>
    .addSubcommand((sub) =>
      sub
        .setName("threadname")
        .setDescription(
          "Set the naming template for auto-created threads in a channel."
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to set thread name for")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("template")
            .setDescription('Thread name template (e.g. "Prompt from {user}")')
            .setRequired(true)
            .setMaxLength(100)
        )
    ),

  /**
   * Main command handler for /autothread
   * Handles:
   *  - 'channel' subcommand (launches interactive channel select menu)
   *  - 'edit' subcommand (logic lives here)
   *  - 'threadname' subcommand (logic lives here)
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // === /autothread channel config ===
    if (subcommand === "channel") {
      // Instruction embed
      const embed = new EmbedBuilder()
        .setTitle("Configure Auto-Thread Channels")
        .setDescription(
          [
            "Select up to 10 channels for auto-threading.",
            "**IMPORTANT:** Any channels not selected will be disabled!",
            "If you want to add or remove a channel, you must reselect all channels you want enabled.",
            "",
            "Your previous embed and thread settings will be restored if you re-add a channel later.",
          ].join("\n")
        )
        .setColor("#5865F2"); // Discord blurple

      const menu = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("autothread_channel_select")
          .setPlaceholder("Pick up to 10 channels")
          .setMinValues(1)
          .setMaxValues(10)
          .addChannelTypes(ChannelType.GuildText)
      );

      await interaction.reply({
        embeds: [embed],
        components: [menu],
        ephemeral: true,
      });
      // Menu logic is handled in your interactionCreate.js (fail proof pattern)
      return;
    }

    // === /autothread edit embed ===
    if (subcommand === "edit") {
      // Get user input from slash command
      const channel = interaction.options.getChannel("channel");
      const title = interaction.options.getString("title") || "";
      const description = interaction.options.getString("description") || "";
      const color = interaction.options.getString("color") || "#5865F2"; // Default: Discord blurple

      // Load or create the guild's config from MongoDB
      let config = await AutoThreadConfig.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        // If no config exists, user must first configure channels
        return interaction.reply({
          content:
            "You must first configure channels for auto-threading with `/autothread channel config`.",
          ephemeral: true,
        });
      }

      // Check if channel is actually configured for auto-threading
      const chanConfig = config.channels.find(
        (c) => c.channelId === channel.id
      );
      if (!chanConfig) {
        return interaction.reply({
          content: `That channel is not configured for auto-threading. Please add it first using \`/autothread channel config\`.`,
          ephemeral: true,
        });
      }

      // Update embed config for that channel
      chanConfig.embed.title = title;
      chanConfig.embed.description = description;
      chanConfig.embed.color = color;

      // Save to MongoDB
      await config.save();

      // Show a preview
      const preview = new EmbedBuilder()
        .setTitle(title || " ")
        .setDescription(description || " ")
        .setColor(color);

      return interaction.reply({
        content: `Embed updated for <#${channel.id}>. Here's a preview:`,
        embeds: [preview],
        ephemeral: true,
      });
    }

    // === /autothread threadname ===
    if (subcommand === "threadname") {
      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template");

      // Load or create the guild's config from MongoDB
      let config = await AutoThreadConfig.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.reply({
          content:
            "You must first configure channels for auto-threading with `/autothread channel config`.",
          ephemeral: true,
        });
      }

      // Check if channel is actually configured for auto-threading
      const chanConfig = config.channels.find(
        (c) => c.channelId === channel.id
      );
      if (!chanConfig) {
        return interaction.reply({
          content: `That channel is not configured for auto-threading. Please add it first using \`/autothread channel config\`.`,
          ephemeral: true,
        });
      }

      // Update thread name template
      chanConfig.threadNameTemplate = template;

      // Save to MongoDB
      await config.save();

      return interaction.reply({
        content: `Thread naming template updated for <#${
          channel.id
        }>! Example: \`${template
          .replace("{user}", interaction.user.username)
          .replace("{message}", "[message]")}\``,
        ephemeral: true,
      });
    }
  },
};
