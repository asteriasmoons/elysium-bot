// commands/donate.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Support the bot with a donation!'),
  
	async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Support Elysium Bot!')
      .setDescription(
        `Hey ${interaction.user}, thanks for snooping around this command. It means that you are wondering how you might could support **Elysium bot**!\n\n` +
        `Hosting and running the bot can get expensive, so I allow others to donate to its cause. All donations will stack up in a PayPal savings pod to pay for any bot expenses.If you'd like to donate, just click the button below.`
      )
      .setColor(0x663399);

    const donateButton = new ButtonBuilder()
      .setLabel('Donate')
      .setStyle(ButtonStyle.Link)
      .setURL('buymeacoffee.com/asteriamoon');

    const row = new ActionRowBuilder().addComponents(donateButton);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};