// utils/embedEditorUI.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

function buildEmbed(doc) {
  const embed = new EmbedBuilder().setColor(doc.color || "#5865F2");

  // Ensure at least one of title or description is set
  const hasTitle = doc.title && doc.title.trim().length > 0;
  const hasDescription = doc.description && doc.description.trim().length > 0;

  if (hasTitle) {
    embed.setTitle(doc.title);
  }

  if (hasDescription) {
    embed.setDescription(doc.description);
  }

  // Discord requires at least one of title or description
  if (!hasTitle && !hasDescription) {
    embed.setDescription("_ _"); // invisible placeholder
  }

  if (doc.author?.name) {
    embed.setAuthor({
      name: doc.author.name,
      iconURL: doc.author.icon_url || undefined,
    });
  }

  if (doc.footer?.text) {
    embed.setFooter({
      text: doc.footer.text,
      iconURL: doc.footer.icon_url || undefined,
    });
  }

  if (doc.footer?.timestamp) {
    embed.setTimestamp(new Date());
  }

  if (doc.thumbnail && doc.thumbnail.trim().length > 0) {
    embed.setThumbnail(doc.thumbnail);
  }

  if (doc.image && doc.image.trim().length > 0) {
    embed.setImage(doc.image);
  }

  return embed;
}

async function sendEmbedEditor(interaction, doc, isNew) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`embed_edit_basic_${doc._id}`)
      .setLabel("Edit Basic Info")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit_author_${doc._id}`)
      .setLabel("Edit Author")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit_footer_${doc._id}`)
      .setLabel("Edit Footer")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit_images_${doc._id}`)
      .setLabel("Edit Images")
      .setStyle(ButtonStyle.Secondary)
  );

  const embed = buildEmbed(doc);

  if (isNew) {
    return interaction.reply({
      content: `**Embed Editor:** \`${doc.name}\``,
      embeds: [embed],
      components: [row1],
      ephemeral: false,
    });
  } else {
    return interaction.reply({
      content: `**Editing Embed:** \`${doc.name}\``,
      embeds: [embed],
      components: [row1],
      ephemeral: false,
    });
  }
}

module.exports = { sendEmbedEditor, buildEmbed };
