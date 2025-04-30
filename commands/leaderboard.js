const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const leaderboardPath = './leaderboard.json';

function getLeaderboard() {
  if (!fs.existsSync(leaderboardPath)) return {};
  return JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the reading sprint leaderboard!'),

  async execute(interaction) {
    const leaderboard = getLeaderboard();
    if (Object.keys(leaderboard).length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Leaderboard')
            .setDescription('No one has logged any pages yet! Join a sprint and submit your ending page to get on the board.')
            .setColor('#4ac4d7')
        ],
        ephemeral: false
      });
    }

    // Sort by pages read, descending
    const sorted = Object.entries(leaderboard)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10

    let desc = '';
    let rank = 1;
    for (const [userId, totalPages] of sorted) {
      desc += `**#${rank}** <@${userId}> — **${totalPages}** pages\n`;
      rank++;
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('<:boox5:1291879709873016842> Reading Sprint Leaderboard')
          .setDescription(desc)
          .setColor('#4ac4d7')
      ]
    });
  }
};