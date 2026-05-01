const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const Confession = require("../models/Confession");
const ConfessionConfig = require("../models/ConfessionConfig");

async function handleButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("confession_submit")
    .setTitle("Submit a Confession")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("confessionText")
          .setLabel("What would you like to share?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
  return interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const confessionText = interaction.fields.getTextInputValue("confessionText");
  const guildId = interaction.guildId;

  const config = await ConfessionConfig.findOne({ guildId });
  if (!config) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e3cff)
          .setTitle("Confession System Not Set Up")
          .setDescription(
            "Please ask an admin to run `/confessions setup` first.",
          ),
      ],
      ephemeral: true,
    });
  }

  const last = await Confession.findOne({ guildId }).sort({ confessionId: -1 });
  const newId = last ? last.confessionId + 1 : 1;

  await Confession.create({
    guildId,
    confessionId: newId,
    content: confessionText,
  });

  const embedTitle = config.embedTitle.replace("{id}", newId);
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(confessionText)
    .setColor(0x9e3cff)
    .setTimestamp();

  const targetChannel = await interaction.client.channels
    .fetch(config.confessionChannelId)
    .catch(() => null);

  if (!targetChannel) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e3cff)
          .setTitle("Confession Channel Missing")
          .setDescription(
            "Could not find the configured confession channel. Ask an admin to re-run `/confessions setup`.",
          ),
      ],
      ephemeral: true,
    });
  }

  const message = await targetChannel.send({ embeds: [embed] });

  try {
    await message.startThread({
      name: `Confession #${newId}`,
      autoArchiveDuration: 1440,
    });
  } catch (err) {
    console.error("[confessions] Failed to create thread:", err);
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9e3cff)
        .setTitle("Confession Sent")
        .setDescription(
          "Your anonymous confession has been submitted successfully.",
        ),
    ],
    ephemeral: true,
  });
}

module.exports = { handleButton, handleModalSubmit };
