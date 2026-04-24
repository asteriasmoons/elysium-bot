// handlers/embedEditorButtonHandler.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const EmbedModel = require("../models/Embed");

module.exports = async function handleEmbedEditorButtons(interaction) {
  if (!interaction.isButton()) return false;

  const [prefix, action, section, embedId] = interaction.customId.split("_");

  if (prefix !== "embed" || action !== "edit") return false;

  // Fetch embed from DB
  const doc = await EmbedModel.findById(embedId);
  if (!doc) {
    await interaction.reply({ content: "Embed not found.", ephemeral: true });
    return true;
  }

  // === BASIC ===
  if (section === "basic") {
    const modal = new ModalBuilder()
      .setCustomId(`embed_modal_basic_${embedId}`)
      .setTitle("Edit Basic Info")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.title || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(doc.description || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("color")
            .setLabel("Hex Color (e.g. #993377)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.color || "#993377"),
        ),
      );

    await interaction.showModal(modal);
    return true;
  }

  // === AUTHOR ===
  if (section === "author") {
    if (!doc.author) doc.author = {};

    const modal = new ModalBuilder()
      .setCustomId(`embed_modal_author_${embedId}`)
      .setTitle("Edit Author")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("author_name")
            .setLabel("Author Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.author?.name || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("author_icon")
            .setLabel("Author Icon URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.author?.icon_url || ""),
        ),
      );

    await interaction.showModal(modal);
    return true;
  }

  // === FOOTER ===
  if (section === "footer") {
    if (!doc.footer) doc.footer = {};

    const modal = new ModalBuilder()
      .setCustomId(`embed_modal_footer_${embedId}`)
      .setTitle("Edit Footer")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("footer_text")
            .setLabel("Footer Text")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.footer?.text || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("footer_icon")
            .setLabel("Footer Icon URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.footer?.icon_url || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("footer_timestamp")
            .setLabel("Add Timestamp? (yes/no)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.footer?.timestamp ? "yes" : "no"),
        ),
      );

    await interaction.showModal(modal);
    return true;
  }

  // === IMAGES ===
  if (section === "images") {
    const modal = new ModalBuilder()
      .setCustomId(`embed_modal_images_${embedId}`)
      .setTitle("Edit Images")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("thumbnail")
            .setLabel("Thumbnail URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.thumbnail || ""),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Main Image URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(doc.image || ""),
        ),
      );

    await interaction.showModal(modal);
    return true;
  }

  return false;
};
