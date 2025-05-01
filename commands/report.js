const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your feedback ID file
const idFile = path.join(__dirname, '..', 'feedback-id.json');
// Your private channel where reports are sent
const FEEDBACK_CHANNEL_ID = '1367620365492420738';

// Helper to get and increment the feedback ID
function getNextFeedbackId() {
  let id = 1;
  try {
    if (fs.existsSync(idFile)) {
      const data = JSON.parse(fs.readFileSync(idFile, 'utf8'));
      id = (data.lastId || 0) + 1;
    }
  } catch (err) {
    // If file is corrupted or unreadable, reset to 1
    id = 1;
  }
  fs.writeFileSync(idFile, JSON.stringify({ lastId: id }), 'utf8');
  return id;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Send feedback or report an issue to the bot developer')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your feedback or report')
        .setRequired(true)
    ),
  async execute(interaction) {
    const feedback = interaction.options.getString('message');
    const user = interaction.user;
    const guild = interaction.guild;
    const feedbackId = getNextFeedbackId();

    // Build the feedback embed
    const embed = new EmbedBuilder()
      .setTitle(`New Bot Feedback / Report #${feedbackId}`)
      .addFields(
        { name: 'From User', value: `${user.tag} (${user.id})`, inline: false },
        { name: 'Server', value: guild ? `${guild.name} (${guild.id})` : 'DM', inline: false },
        { name: 'Message', value: feedback, inline: false }
      )
      .setTimestamp()
      .setColor('#ff69b4');

    // Try to send to your feedback channel
    try {
      const devChannel = await interaction.client.channels.fetch(FEEDBACK_CHANNEL_ID);
      await devChannel.send({ embeds: [embed] });
      await interaction.reply({
        content: `Thank you! Your feedback has been logged as **#${feedbackId}**.`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: 'Sorry, I couldn\'t deliver your feedback. Please try again later.',
        ephemeral: true
      });
      // Optional: log error for debugging
      console.error('Failed to send feedback:', err);
    }
  }
};