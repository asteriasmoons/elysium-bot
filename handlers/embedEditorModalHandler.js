// handlers/embedEditorModalHandler.js

const EmbedModel = require("../models/Embed");
const { buildEmbed } = require("../utils/embedEditorUI");

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async function handleEmbedEditorModal(interaction) {
  if (!interaction.isModalSubmit()) return false;

  const [prefix, type, section, embedId] = interaction.customId.split("_");

  if (prefix !== "embed" || type !== "modal") return false;

  const doc = await EmbedModel.findById(embedId);
  if (!doc) {
    await interaction.reply({
      content: "Embed not found.",
      ephemeral: true,
    });
    return true;
  }

  function emptyToNull(str) {
    return typeof str === "string" && str.trim() === "" ? null : str;
  }

  // === BASIC ===
  if (section === "basic") {
    doc.title = emptyToNull(interaction.fields.getTextInputValue("title"));
    doc.description = emptyToNull(
      interaction.fields.getTextInputValue("description"),
    );
    doc.color =
      emptyToNull(interaction.fields.getTextInputValue("color")) || "#993377";
  }

  // === AUTHOR ===
  if (section === "author") {
    if (!doc.author) doc.author = {};
    doc.author.name = emptyToNull(
      interaction.fields.getTextInputValue("author_name"),
    );
    doc.author.icon_url = emptyToNull(
      interaction.fields.getTextInputValue("author_icon"),
    );
  }

  // === FOOTER ===
  if (section === "footer") {
    if (!doc.footer) doc.footer = {};
    doc.footer.text = emptyToNull(
      interaction.fields.getTextInputValue("footer_text"),
    );
    doc.footer.icon_url = emptyToNull(
      interaction.fields.getTextInputValue("footer_icon"),
    );

    const timestampInput = interaction.fields
      .getTextInputValue("footer_timestamp")
      .toLowerCase();

    doc.footer.timestamp =
      timestampInput === "yes" || timestampInput === "true";
  }

  // === IMAGES ===
  if (section === "images") {
    doc.thumbnail = emptyToNull(
      interaction.fields.getTextInputValue("thumbnail"),
    );
    doc.image = emptyToNull(interaction.fields.getTextInputValue("image"));
  }

  await doc.save();

  return interaction.update({
    content: `**Editing Embed:** \`${doc.name}\` (updated!)`,
    embeds: [buildEmbed(doc)],
    components: [
      new ActionRowBuilder().addComponents(
        ...[
          { label: "Edit Basic Info", id: "basic", style: "Secondary" },
          { label: "Edit Author", id: "author", style: "Secondary" },
          { label: "Edit Footer", id: "footer", style: "Secondary" },
          { label: "Edit Images", id: "images", style: "Secondary" },
        ].map((btn) =>
          new ButtonBuilder()
            .setCustomId(`embed_edit_${btn.id}_${doc._id}`)
            .setLabel(btn.label)
            .setStyle(ButtonStyle[btn.style]),
        ),
      ),
    ],
  });
};
