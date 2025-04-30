const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show information about all book sprint commands!'),
  async execute(interaction) {
    // First Embed: Command List
    const helpEmbed = new EmbedBuilder()
      .setTitle('<:boox5:1291879709873016842> Book Sprint Bot Help')
      .setDescription('Here are all the commands you can use:')
      .setColor('#572194')
      .addFields(
        { name: '/setprofile', value: 'Set up your reading profile! You can add a bio, your current read, number of books read this year, and your favorite genre.' },
        { name: '/profile', value: 'View your profile and see your reading stats.' },
		{ name: '/editprofile', value: 'Edit your profile details' },
        { name: '/sprint start [duration]', value: 'Start a new reading sprint. Example: `/sprint start 30m` or `/sprint start 1h`.' },
        { name: '/sprint join [starting_pages]', value: 'Join the current sprint and set your starting page number.' },
        { name: '/sprint finish [ending_pages]', value: 'Submit your ending page number for the sprint.' },
        { name: '/sprint timeleft', value: 'See how much time is left in the current sprint.' },
		{ name: '/sprint end', value: 'Forces the sprint to end' },
        { name: '/leaderboard', value: 'See the top readers and their total pages read.' },
		{ name: '/buddyread start [book] [user]', value: 'Start a buddy read with a friend or other server member' },
		{ name: '/buddyread finish [book] [user]', value: 'Finish your buddy read on a book with a user' },
		{ name: '/buddyread list', value: 'A list of your buddy reads or buddy reads in the server' },
		{ name: '/reviewadd [book] [author] [rating] [review]', value: 'Add a book review to the bot' },
		{ name: '/review author [author]', value: 'View a book review by author' },
		{ name: '/review book [book]', value: 'Find a specific book review by the book title' },
		{ name: '/review delete [book] [author]', value: 'Delete a book review you have written' },
		{ name: '/review edit [book] [author] [rating] [review]', value: 'Edit one of your book reviews' },
		{ name: '/review list', value: 'List of all book reviews stored in the bot' },
		{ name: '/review view [book]', value: 'Find a review based on the book title' }
      )
      .setFooter({ text: 'Click "Next" for more info on how sprints work!' });

    // Second Embed: How Sprints Work (Conversational)
    const howEmbed = new EmbedBuilder()
      .setTitle('<:boox5:1291879709873016842> How Book Sprints Work')
      .setColor('#572194')
      .setDescription(
        `Book sprints are a fun way to read together and track your progress! When a sprint starts, join in by telling the bot what page you're currently on—this is your starting page. Once the sprint ends, submit the page you finished on. The bot will do the math and let you know how many pages you read during the sprint!\n\n` +
        `For example, if you start on page 25 and end on page 40, the bot will record that you read 15 pages. It's a great way to stay motivated and see how much you can read with friends!`
      )
      .setFooter({ text: 'Happy Sprinting!' });

    // Create buttons
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
    );

    // Send initial embed with "Next" button
    const message = await interaction.reply({
      embeds: [helpEmbed],
      components: [row1],
      fetchReply: true
    });

    // Create a collector to handle button clicks
    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'next') {
        await i.update({ embeds: [howEmbed], components: [row2] });
      } else if (i.customId === 'back') {
        await i.update({ embeds: [helpEmbed], components: [row1] });
      }
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch (e) { /* message may have been deleted */ }
    });
  }
};