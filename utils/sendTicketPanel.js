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
  const embed = new EmbedBuilder()
    .setTitle(panel.embed?.title || "Need Help?")
    .setDescription(
      panel.embed?.description || "Click the button below to open a ticket.",
    )
    .setColor(panel.embed?.color || "#5103aa");

  if (panel.embed?.author?.name) {
    embed.setAuthor({
      name: panel.embed.author.name,
      iconURL: panel.embed.author.icon_url || undefined,
    });
  }

  if (panel.embed?.footer?.text) {
    embed.setFooter({
      text: panel.embed.footer.text,
      iconURL: panel.embed.footer.icon_url || undefined,
    });
  }

  if (panel.embed?.thumbnail) {
    embed.setThumbnail(panel.embed.thumbnail);
  }

  if (panel.embed?.image) {
    embed.setImage(panel.embed.image);
  }

  if (panel.embed?.footer?.timestamp) {
    embed.setTimestamp(new Date());
  }

  // --- Send ---
  return channel.send({
    embeds: [embed],
    components: [row],
  });
}

module.exports = { sendTicketPanel };
