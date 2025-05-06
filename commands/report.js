// commands/report.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Report = require('../models/Report');
const getNextReportId = require('../utils/getNextReportId');

const FEEDBACK_CHANNEL_ID = '1369104061667741778';

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

    // Get next feedback ID from database
    const feedbackId = await getNextReportId();

    // Save to DB
    await Report.create({
      feedbackId,
      userId: user.id,
      userTag: user.tag,
      guildId: guild ? guild.id : null,
      guildName: guild ? guild.name : null,
      message: feedback
    });

    // Build the feedback embed
    const embed = new EmbedBuilder()
      .setTitle(`New Bot Feedback / Report #${feedbackId}`)
      .addFields(
        { name: '**From User**', value: `${user.tag} (${user.id})`, inline: false },
        { name: '**Server**', value: guild ? `${guild.name} (${guild.id})` : 'DM', inline: false },
        { name: '**Message**', value: feedback, inline: false }
      )
      .setTimestamp()
      .setColor('#993377');

    // Try to send to your feedback channel
    try {
      const devChannel = await interaction.client.channels.fetch(FEEDBACK_CHANNEL_ID);
      await devChannel.send({ embeds: [embed] });
      await interaction.reply({
        content: `Thank you! Your feedback has been logged as **#${feedbackId}**.`,
        ephemeral: false
      });
    } catch (err) {
      await interaction.reply({
        content: 'Sorry, I couldn\'t deliver your feedback. Please try again later.',
        ephemeral: false
      });
      console.error('Failed to send feedback:', err);
    }
  }
};