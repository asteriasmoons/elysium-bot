
// handlers/ticketControlHandler.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require("discord.js");

const TicketPanel = require("../models/TicketPanel");
const TicketInstance = require("../models/TicketInstance");

async function generateTranscript(channel) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      before: lastId,
    });

    messages = messages.concat(Array.from(fetched.values()));

    if (fetched.size !== 100) break;
    lastId = fetched.last()?.id;
  }

  messages = messages.reverse();

  let transcript = "";

  for (const msg of messages) {
    transcript += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
  }

  return Buffer.from(transcript, "utf-8");
}

module.exports = async function handleTicketControls(interaction) {
  // --- Claim ---
  if (interaction.isButton() && interaction.customId === "ticket_claim") {
    const ticket = await TicketInstance.findOne({
      channelId: interaction.channel.id,
    });

    if (!ticket) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("Ticket not found in database."),
        ],
        ephemeral: true,
      });
      return true;
    }

    if (
      interaction.user.id !== ticket.userId &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("You don't have permission to claim this ticket."),
        ],
        ephemeral: true,
      });
      return true;
    }

    if (ticket.claimedBy) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5103aa)
            .setDescription(
              `This ticket is already claimed by <@${ticket.claimedBy}>.`
            ),
        ],
        ephemeral: true,
      });
      return true;
    }

    ticket.claimedBy = interaction.user.id;
    await ticket.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5103aa)
          .setDescription(`Ticket claimed by <@${interaction.user.id}>.`),
      ],
      ephemeral: false,
    });

    return true;
  }

  // --- Close ---
  if (interaction.isButton() && interaction.customId === "ticket_close") {
    const ticket = await TicketInstance.findOne({
      channelId: interaction.channel.id,
    });

    if (!ticket) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("Ticket not found in database."),
        ],
        ephemeral: true,
      });
      return true;
    }

    if (
      interaction.user.id !== ticket.userId &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("You don't have permission to close this ticket."),
        ],
        ephemeral: true,
      });
      return true;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffcc00)
          .setDescription("Are you sure you want to close this ticket?"),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_close_confirm")
            .setLabel("Yes, Close")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("ticket_close_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
      ephemeral: true,
    });

    return true;
  }

  if (interaction.isButton() && interaction.customId === "ticket_close_cancel") {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcefbdc)
          .setDescription("Ticket close cancelled."),
      ],
      components: [],
    });

    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "ticket_close_confirm"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("ticket_close_reason_modal")
      .setTitle("Close Ticket Reason")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("close_reason")
            .setLabel("Reason for closing the ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
        )
      );

    await interaction.showModal(modal);
    return true;
  }

  // --- Delete ---
  if (interaction.isButton() && interaction.customId === "ticket_delete") {
    const ticket = await TicketInstance.findOne({
      channelId: interaction.channel.id,
    });

    if (
      !ticket ||
      (interaction.user.id !== ticket.userId &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
    ) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("You don't have permission to delete this ticket."),
        ],
        ephemeral: true,
      });
      return true;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfef2a8)
          .setDescription("Are you **sure** you want to delete this ticket?"),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_delete_confirm")
            .setLabel("Yes, Delete")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("ticket_delete_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
      ephemeral: true,
    });

    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "ticket_delete_confirm"
  ) {
    const ticket = await TicketInstance.findOne({
      channelId: interaction.channel.id,
    });

    if (
      !ticket ||
      (interaction.user.id !== ticket.userId &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
    ) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9e10a0)
            .setDescription("You don't have permission to delete this ticket."),
        ],
        ephemeral: true,
      });
      return true;
    }

    await interaction.channel.delete("Ticket deleted by user or mod");

    ticket.status = "closed";
    ticket.closedAt = new Date();
    ticket.closeReason = "Deleted by user or moderator";
    await ticket.save();

    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "ticket_delete_cancel"
  ) {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcefbdc)
          .setDescription("Ticket deletion cancelled."),
      ],
      components: [],
    });

    return true;
  }

  // --- Close Reason Modal / Transcript ---
  if (
    interaction.isModalSubmit() &&
    interaction.customId === "ticket_close_reason_modal"
  ) {
    const channel = interaction.channel;
    const ticket = await TicketInstance.findOne({ channelId: channel.id });

    if (!ticket) {
      await interaction.reply({
        content: "Ticket not found in database.",
        ephemeral: true,
      });
      return true;
    }

    ticket.closedAt = new Date();
    ticket.status = "closed";
    ticket.closedBy = interaction.user.id;
    ticket.closeReason =
      interaction.fields.getTextInputValue("close_reason") ||
      "No reason provided.";

    await ticket.save();

    const panel = await TicketPanel.findOne({
      guildId: interaction.guild.id,
      panelName: ticket.panelName,
    });

    let transcriptBuffer = null;

    if (panel && panel.transcriptsEnabled) {
      transcriptBuffer = await generateTranscript(channel);
    }

    const embed = new EmbedBuilder()
      .setTitle("Ticket Closed")
      .addFields(
        {
          name: "Ticket Number",
          value: `#${ticket.ticketNumber || "N/A"}`,
          inline: true,
        },
        {
          name: "Ticket Author",
          value: `<@${ticket.userId}>`,
          inline: true,
        },
        {
          name: "Claimed By",
          value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Unclaimed",
          inline: true,
        },
        {
          name: "Closed By",
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: "Opened",
          value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Closed",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Close Reason",
          value: ticket.closeReason || "No reason provided.",
        }
      )
      .setColor(0x9e10a0);

    if (transcriptBuffer) {
      try {
        const user = await interaction.client.users.fetch(ticket.userId);

        await user.send({
          content: `Here is the transcript and details for your closed ticket in **${interaction.guild.name}**:`,
          embeds: [embed],
          files: [
            {
              attachment: transcriptBuffer,
              name: `transcript-${channel.id}.txt`,
            },
          ],
        });
      } catch (e) {}
    }

    if (panel && panel.transcriptChannelId) {
      const staffChannel = interaction.guild.channels.cache.get(
        panel.transcriptChannelId
      );

      if (staffChannel && staffChannel.isTextBased()) {
        await staffChannel.send({
          content: `Transcript for closed ticket #${channel.name}:`,
          embeds: [embed],
          files: transcriptBuffer
            ? [
                {
                  attachment: transcriptBuffer,
                  name: `transcript-${channel.id}.txt`,
                },
              ]
            : [],
        });
      }
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e10a0)
          .setDescription("This ticket will be closed in 5 seconds."),
      ],
      ephemeral: false,
    });

    setTimeout(async () => {
      await channel.delete().catch(() => {});
    }, 5000);

    return true;
  }

  return false;
};