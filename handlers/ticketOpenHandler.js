// handlers/ticketOpenHandler.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const TicketPanel = require("../models/TicketPanel");
const TicketInstance = require("../models/TicketInstance");

module.exports = async function handleTicketOpen(interaction) {
  // --- Open Ticket Modal Button ---
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("open_ticket_modal:")
  ) {
    const panelName = interaction.customId.split(":")[1];

    const panel = await TicketPanel.findOne({
      guildId: interaction.guild.id,
      panelName,
    });

    if (!panel) {
      await interaction.reply({
        content: `Ticket panel \`${panelName}\` not found.`,
        ephemeral: false,
      });
      return true;
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_submit:${panelName}`)
      .setTitle("Open a Ticket")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("issue")
            .setLabel("Describe your issue")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
    return true;
  }

  // --- Ticket Modal Submit ---
  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("ticket_modal_submit:")
  ) {
    try {
      const panelName = interaction.customId.split(":")[1];
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      const panel = await TicketPanel.findOne({
        guildId,
        panelName,
      });

      if (!panel) {
        await interaction.reply({
          content: `Ticket panel \`${panelName}\` not found.`,
          ephemeral: false,
        });
        return true;
      }

      const issue = interaction.fields.getTextInputValue("issue");

      const latestTicket = await TicketInstance.findOne({ guildId })
        .sort({ ticketNumber: -1 })
        .select("ticketNumber")
        .lean();

      const ticketNumber = latestTicket ? latestTicket.ticketNumber + 1 : 1;

      const overwrites = [
        {
          id: interaction.guild.roles.everyone,
          deny: ["ViewChannel"],
        },
        {
          id: userId,
          allow: ["ViewChannel", "SendMessages"],
        },
      ];

      const channelOptions = {
        name: `${interaction.user.username.toLowerCase()}-${ticketNumber}`,
        type: ChannelType.GuildText,
        permissionOverwrites: overwrites,
      };

      if (panel.ticketCategoryId) {
        channelOptions.parent = panel.ticketCategoryId;
      }

      const ticketChannel =
        await interaction.guild.channels.create(channelOptions);

      await TicketInstance.create({
        ticketId: ticketChannel.id,
        guildId,
        ticketNumber,
        userId,
        panelName,
        channelId: ticketChannel.id,
        status: "open",
        content: { issue },
      });

      let greetingEmbed;

      if (panel.greetingEmbed && typeof panel.greetingEmbed === "object") {
        greetingEmbed = new EmbedBuilder();

        if (panel.greetingEmbed.title) {
          greetingEmbed.setTitle(panel.greetingEmbed.title);
        }

        if (panel.greetingEmbed.description) {
          greetingEmbed.setDescription(panel.greetingEmbed.description);
        }

        if (panel.greetingEmbed.color) {
          greetingEmbed.setColor(panel.greetingEmbed.color);
        }

        if (
          panel.greetingEmbed.author &&
          (panel.greetingEmbed.author.name ||
            panel.greetingEmbed.author.icon_url)
        ) {
          greetingEmbed.setAuthor({
            name: panel.greetingEmbed.author.name || "",
            iconURL: panel.greetingEmbed.author.icon_url || undefined,
          });
        }

        if (
          panel.greetingEmbed.footer &&
          (panel.greetingEmbed.footer.text ||
            panel.greetingEmbed.footer.icon_url)
        ) {
          greetingEmbed.setFooter({
            text: panel.greetingEmbed.footer.text || "",
            iconURL: panel.greetingEmbed.footer.icon_url || undefined,
          });
        }

        if (panel.greetingEmbed.footer?.timestamp) {
          greetingEmbed.setTimestamp(new Date());
        }

        if (panel.greetingEmbed.thumbnail) {
          greetingEmbed.setThumbnail(panel.greetingEmbed.thumbnail);
        }

        if (panel.greetingEmbed.image) {
          greetingEmbed.setImage(panel.greetingEmbed.image);
        }
      } else {
        greetingEmbed = new EmbedBuilder()
          .setTitle("Ticket Opened")
          .setDescription(
            panel.greeting ||
              "Thank you for opening a ticket! A moderator will be with you shortly.",
          );
      }

      greetingEmbed.addFields(
        { name: "Ticket Number", value: `#${ticketNumber}`, inline: true },
        { name: "Ticket Author", value: `<@${userId}>`, inline: true },
        { name: "Issue", value: issue || "No description provided" },
      );

      const claimBtn = new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Secondary);

      const closeBtn = new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close")
        .setStyle(ButtonStyle.Secondary);

      const deleteBtn = new ButtonBuilder()
        .setCustomId("ticket_delete")
        .setLabel("Delete")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(
        claimBtn,
        closeBtn,
        deleteBtn,
      );

      let mention = `<@${userId}>`;
      if (panel.roleToPing) {
        mention += ` <@&${panel.roleToPing}>`;
      }

      await ticketChannel.send({
        content: mention,
        embeds: [greetingEmbed],
        components: [row],
      });

      await interaction.reply({
        content: `Your ticket has been created: <#${ticketChannel.id}>`,
        ephemeral: true,
      });

      return true;
    } catch (err) {
      console.error("Ticket Modal Submit Error:", err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Something went wrong while creating your ticket.",
          ephemeral: true,
        });
      }

      return true;
    }
  }

  return false;
};
