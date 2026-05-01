const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const ConfessionConfig = require("../models/ConfessionConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confessions")
    .setDescription("Manage the anonymous confession system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configure the confession system")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to send confession messages")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("title")
            .setDescription(
              "Embed title (use {id} to include the confession number)"
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Send the confession panel (embed and button)")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to send the panel into")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /confessions setup
    if (sub === "setup") {
      const channel = interaction.options.getChannel("channel");
      const rawTitle = interaction.options.getString("title");
      const title = rawTitle || "Confession #{id}";

      if (!title.includes("{id}")) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("Missing `{id}` Placeholder")
          .setDescription(
            "Your title must include `{id}` so the confession number can be inserted.\n\nExample: `Confession #{id}`"
          )
          .setColor(0x9e3cff);

        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await ConfessionConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          guildId: interaction.guild.id,
          confessionChannelId: channel.id,
          embedTitle: title,
        },
        { upsert: true, new: true }
      );

      const successEmbed = new EmbedBuilder()
        .setTitle("Confession System Configured")
        .addFields(
          { name: "Channel", value: `<#${channel.id}>`, inline: true },
          { name: "Embed Title", value: title, inline: true }
        )
        .setColor(0x9e3cff);

      return interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }

    // /confessions send
    if (sub === "send") {
      const panelChannel = interaction.options.getChannel("channel");

      const embed = new EmbedBuilder()
        .setTitle("Anonymous Confessions")
        .setDescription(
          "Share your thoughts, secrets, or confessions anonymously with our community! Just click the button below to send in your confession—no names attached, just honesty and support. Whether its something funny, serious, or heartfelt, we are here to listen."
        )
        .setColor(0x9e3cff);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confession_open_modal")
          .setLabel("Submit Confession")
          .setStyle(ButtonStyle.Secondary)
      );

      await panelChannel.send({ embeds: [embed], components: [row] });

      const confirmEmbed = new EmbedBuilder()
        .setTitle("Confession Panel Sent")
        .setDescription(
          `The confession submission panel was sent to <#${panelChannel.id}>.`
        )
        .setColor(0x9e3cff);

      return interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
  },
};
