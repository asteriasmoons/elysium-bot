// commands/tarot.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const tarotCards = require('../scripts/tarotcards.json'); // Adjust path if needed

function getRandomCard(drawnCards = []) {
  // Draw unique card (for three-card spread)
  let card;
  do {
    card = tarotCards[Math.floor(Math.random() * tarotCards.length)];
  } while (drawnCards.find(c => c.name === card.name)); // avoid duplicates in three-card spread

  const isReversed = Math.random() < 0.5;
  return {
    ...card,
    orientation: isReversed ? "Reversed" : "Upright",
    meaning: isReversed ? card.reversed : card.upright
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tarot')
    .setDescription('Draw a random tarot card (one or three card spread)')
    .addStringOption(option =>
      option
        .setName('spread')
        .setDescription('Choose your spread')
        .setRequired(true)
        .addChoices(
          { name: 'One Card', value: 'one' },
          { name: 'Three Card', value: 'three' }
        )
    ),
  async execute(interaction) {
    const spread = interaction.options.getString('spread');

    if (spread === 'one') {
      const card = getRandomCard();
      const embed = new EmbedBuilder()
        .setTitle(`${card.name} (${card.orientation})`)
        .setDescription(card.meaning)
        .setFooter({ text: card.suit })
        .setColor(card.orientation === "Reversed" ? 0x8E44AD : 0x3498DB); // Purple for reversed, blue for upright

      await interaction.reply({ embeds: [embed] });
    } else if (spread === 'three') {
      const positions = ["Past", "Present", "Future"];
      const drawn = [];

      while (drawn.length < 3) {
        drawn.push(getRandomCard(drawn));
      }

      const embed = new EmbedBuilder()
        .setTitle("Your Three Card Tarot Spread")
        .setColor(0x2ECC71);

      drawn.forEach((card, i) => {
        embed.addFields({
          name: `${positions[i]}: ${card.name} (${card.orientation})`,
          value: `*${card.suit}*\n${card.meaning}`,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed] });
    }
  }
};