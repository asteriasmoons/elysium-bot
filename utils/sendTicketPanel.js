const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

async function sendTicketPanel({ panel, channel }) {
  if (!channel || !channel.isTextBased()) {
    throw new Error("Invalid channel");
  }

  // --- Button ---
  const button = new ButtonBuilder()
    .setCustomId(`open_ticket_modal:${panel.panelName}`)
    .setLabel(panel.buttonLabel || "Open Ticket")
    .setStyle(ButtonStyle.Secondary);

  if (panel.emoji) {
    button.setEmoji(panel.emoji);
  }

  const row = new ActionRowBuilder().addComponents(button);

  // --- Embed ---
  const embed = new EmbedBuilder({
    title: panel.embed?.title || "Need Help?",
    description:
      panel.embed?.description || "Click the button below to open a ticket.",
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

  // --- Send ---
  return channel.send({
    embeds: [embed],
    components: [row],
  });
}

module.exports = { sendTicketPanel };
