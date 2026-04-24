const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

function cleanString(value) {
  const trimmed = String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  return trimmed || null;
}

function cleanUrl(value) {
  const trimmed = cleanString(value);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

function cleanColor(value) {
  const trimmed = cleanString(value);
  if (!trimmed) return "#5103aa";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function buildPanelEmbed(panel) {
  const source = panel?.embed ?? {};

  const title = cleanString(source.title);
  const description =
    cleanString(source.description) || "Click the button below to open a ticket.";
  const color = cleanColor(source.color);

  const authorName = cleanString(source.author?.name);
  const authorIcon = cleanUrl(source.author?.icon_url);

  const footerText = cleanString(source.footer?.text);
  const footerIcon = cleanUrl(source.footer?.icon_url);

  const thumbnail = cleanUrl(source.thumbnail);
  const image = cleanUrl(source.image);

  const embed = new EmbedBuilder()
    .setDescription(description)
    .setColor(color);

  if (title) {
    embed.setTitle(title);
  }

  if (authorName) {
    embed.setAuthor({
      name: authorName,
      iconURL: authorIcon || undefined,
    });
  }

  if (footerText) {
    embed.setFooter({
      text: footerText,
      iconURL: footerIcon || undefined,
    });
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (image) {
    embed.setImage(image);
  }

  if (source.footer?.timestamp) {
    embed.setTimestamp(new Date());
  }

  return embed;
}

async function sendTicketPanel({ panel, channel }) {
  if (!channel || !channel.isTextBased()) {
    throw new Error("Invalid channel");
  }

  const panelName = cleanString(panel?.panelName) || "support";
  const buttonLabel = cleanString(panel?.buttonLabel) || "Open Ticket";

  const button = new ButtonBuilder()
    .setCustomId(`open_ticket_modal:${panelName}`)
    .setLabel(buttonLabel)
    .setStyle(ButtonStyle.Secondary);

  const emoji = cleanString(panel?.emoji);
  if (emoji) {
    button.setEmoji(emoji);
  }

  const row = new ActionRowBuilder().addComponents(button);
  const embed = buildPanelEmbed(panel);

  return channel.send({
    embeds: [embed],
    components: [row],
  });
}

module.exports = { sendTicketPanel, buildPanelEmbed };
