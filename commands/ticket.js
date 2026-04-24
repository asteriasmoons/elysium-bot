const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const TicketPanel = require("../models/TicketPanel");
const { sendTicketPanelEditor } = require("../events/ticketPanelUi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription(
      "Create, edit, list, post, delete, or set ping role for ticket panels"
    )
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new ticket panel")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name to identify this panel")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit an existing ticket panel")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the panel to edit")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete an existing panel")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the panel to delete")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all existing ticket panels")
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription(
          "Post a configured ticket panel to its assigned channel"
        )
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the panel to post")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("setrole")
        .setDescription("Set a role to be pinged when a ticket is created")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the panel to set the role for")
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("The role to ping when a ticket is opened")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("settranscriptchannel")
        .setDescription(
          "Set the channel to receive transcripts for a ticket panel"
        )
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Name of the ticket panel")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to send transcripts to")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const name = interaction.options.getString("name")?.toLowerCase();

    // Permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "You need **Manage Server** permission to use this command.",
        ephemeral: true,
      });
    }

    // --- CREATE ---
    if (sub === "create") {
      const existing = await TicketPanel.findOne({ guildId, panelName: name });
      if (existing) {
        return interaction.reply({
          content: `A panel named \`${name}\` already exists.`,
          ephemeral: true,
        });
      }

      const panel = await TicketPanel.create({
        guildId,
        creatorId: userId,
        panelName: name,
        transcriptsEnabled: true,
        emoji: "",
        greeting:
          "Thank you for opening a ticket! A moderator will be with you shortly.",
        roleToPing: "", // <--- new field
        embed: {
          title: "",
          description: "",
          color: "#5103aa",
          author: { name: "", icon_url: "" },
          footer: { text: "", icon_url: "", timestamp: false },
          thumbnail: "",
          image: "",
        },
      });

      return sendTicketPanelEditor(interaction, panel);
    }

    // --- EDIT ---
    if (sub === "edit") {
      const panel = await TicketPanel.findOne({ guildId, panelName: name });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` was found.`,
          ephemeral: true,
        });
      }
      return sendTicketPanelEditor(interaction, panel);
    }

    // --- DELETE ---
    if (sub === "delete") {
      const deleted = await TicketPanel.findOneAndDelete({
        guildId,
        panelName: name,
      });

      if (!deleted) {
        const notFoundEmbed = new EmbedBuilder()
          .setTitle("Panel Not Found")
          .setDescription(`No panel named \`${name}\` was found.`)
          .setColor("#5103aa"); // Red

        return interaction.reply({
          embeds: [notFoundEmbed],
          ephemeral: true,
        });
      }

      const deletedEmbed = new EmbedBuilder()
        .setTitle("Panel Deleted")
        .setDescription(`Panel \`${name}\` has been deleted.`)
        .setColor("#5103aa"); // Green

      return interaction.reply({
        embeds: [deletedEmbed],
        ephemeral: true,
      });
    }

    // --- LIST ---
    if (sub === "list") {
      const panels = await TicketPanel.find({ guildId });
      if (!panels.length) {
        // No panels found - use an embed for consistency!
        const noPanelsEmbed = new EmbedBuilder()
          .setTitle("No Ticket Panels Found")
          .setDescription(
            "There are no ticket panels configured for this server."
          )
          .setColor("#5103aa"); // Red (or your preferred color)
        return interaction.reply({
          embeds: [noPanelsEmbed],
          ephemeral: true,
        });
      }

      const panelList = panels.map((p) => `• \`${p.panelName}\``).join("\n");
      const listEmbed = new EmbedBuilder()
        .setTitle("Ticket Panels")
        .setDescription(panelList)
        .setColor("#5103aa"); // Discord blurple, or your preferred color

      return interaction.reply({
        embeds: [listEmbed],
        ephemeral: true,
      });
    }

    // --- POST ---
    if (sub === "post") {
      const panel = await TicketPanel.findOne({ guildId, panelName: name });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` was found.`,
          ephemeral: true,
        });
      }

      const channel = interaction.guild.channels.cache.get(panel.postChannelId);
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({
          content:
            "This panel has no valid post channel set. Use the select menu to assign one.",
          ephemeral: true,
        });
      }

      const button = new ButtonBuilder()
        .setCustomId(`open_ticket_modal:${panel.panelName}`)
        .setLabel(panel.buttonLabel || "Open Ticket")
        .setStyle(ButtonStyle.Secondary);

      if (panel.emoji) button.setEmoji(panel.emoji);

      const row = new ActionRowBuilder().addComponents(button);

      // --- Build Embed using all custom fields (direct from schema) ---
      const embed = new EmbedBuilder({
        title: panel.embed?.title || "Need Help?",
        description:
          panel.embed?.description ||
          "Click the button below to open a ticket.",
        color: panel.embed?.color || "#5103aa",
        author: panel.embed?.author?.name
          ? {
              name: panel.embed.author.name,
              icon_url: panel.embed.author.icon_url || undefined,
            }
          : undefined,
        footer: panel.embed?.footer?.text
          ? {
              text: panel.embed.footer.text,
              icon_url: panel.embed.footer.icon_url || undefined,
            }
          : undefined,
        thumbnail: panel.embed?.thumbnail || undefined,
        image: panel.embed?.image || undefined,
        timestamp: panel.embed?.footer?.timestamp ? new Date() : undefined,
      });

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `Ticket panel \`${name}\` has been posted to <#${channel.id}>.`,
        ephemeral: true,
      });
    }

    // --- SET ROLE TO PING ---
    if (sub === "setrole") {
      const role = interaction.options.getRole("role");
      const panel = await TicketPanel.findOne({ guildId, panelName: name });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` was found.`,
          ephemeral: true,
        });
      }
      panel.roleToPing = role.id;
      await panel.save();

      return interaction.reply({
        content: `Role <@&${role.id}> will now be pinged for tickets created with panel \`${name}\`.`,
        ephemeral: true,
      });
    }
    // --- SET TRANSCRIPT CHANNEL ---
    if (sub === "settranscriptchannel") {
      const panel = await TicketPanel.findOne({ guildId, panelName: name });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` was found.`,
          ephemeral: true,
        });
      }
      const channel = interaction.options.getChannel("channel");
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({
          content: `The selected channel is not a text channel.`,
          ephemeral: true,
        });
      }
      panel.transcriptChannelId = channel.id;
      await panel.save();
      return interaction.reply({
        content: `Transcript channel for panel \`${name}\` set to <#${channel.id}>.`,
        ephemeral: true,
      });
    }
  },
};
