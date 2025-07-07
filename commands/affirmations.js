// commands/affirmation.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const affirmations = require('../utils/affirmations'); // Adjust path if needed!

module.exports = {
  data: new SlashCommandBuilder()
    .setName('affirmation')
    .setDescription('Receive a gentle, self-compassionate affirmation'),
  async execute(interaction) {
    const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    const embed = new EmbedBuilder()
      .setColor(0x993399) // Pretty lavender. Change if you want!
      .setTitle('✨ Affirmation ✨')
      .setDescription(affirmation);
    await interaction.reply({ embeds: [embed] }); // Public by default; set ephemeral: true if you want
  }
};