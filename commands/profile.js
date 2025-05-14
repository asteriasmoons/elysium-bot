const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../models/Profile');
const { trusted } = require('mongoose');

const customEmoji = '<:zts7:1343353133425885284>';

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Manage your book profile')
    // View subcommand
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View a user\'s book profile')
        .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
    )
    // Set subcommand
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Create your book profile (overwrites existing)')
        .addStringOption(opt => opt.setName('bio').setDescription('A short bio about you').setRequired(true))
        .addStringOption(opt => opt.setName('intention').setDescription('Display your current intention or goal for the month').setRequired(true))
        .addStringOption(opt => opt.setName('affirmation').setDescription('Display your favorite affirmation').setRequired(true))
        .addStringOption(opt => opt.setName('current_read').setDescription('The book you are currently reading').setRequired(true))
        .addStringOption(opt => opt.setName('reading_goal').setDescription('Your reading goal for this year').setRequired(true))
        .addStringOption(opt => opt.setName('favorite_genre').setDescription('Your favorite book genre').setRequired(true))
        .addStringOption(opt => opt.setName('preferred_format').setDescription('Preferred reading format (Physical, eBook, Audiobook, All)').setRequired(true))
        .addStringOption(opt => opt.setName('favorite_author').setDescription('Your favorite author').setRequired(true))
        .addStringOption(opt => opt.setName('gift_list_url').setDescription('Optionally add your Amazon gift list URL').setRequired(false))
    )
    // Edit subcommand
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit your book profile')
        .addStringOption(opt => opt.setName('bio').setDescription('Edit your bio').setRequired(false))
        .addStringOption(opt => opt.setName('intention').setDescription('Display your current intention or goal for the month').setRequired(false))
        .addStringOption(opt => opt.setName('affirmation').setDescription('Display your favorite affirmation').setRequired(false))
        .addStringOption(opt => opt.setName('current_read').setDescription('Edit your current read').setRequired(false))
        .addStringOption(opt => opt.setName('reading_goal').setDescription('Edit your reading goal for this year').setRequired(false))
        .addStringOption(opt => opt.setName('favorite_genre').setDescription('Edit your favorite genre').setRequired(false))
        .addStringOption(opt => opt.setName('preferred_format').setDescription('Edit your preferred format').setRequired(false))
        .addStringOption(opt => opt.setName('favorite_author').setDescription('Edit your favorite author').setRequired(false))
        .addStringOption(opt => opt.setName('gift_list_url').setDescription('Optionally add your Amazon gift list url').setRequired(false))
    ),
	
  async execute(interaction) {
	console.log('Profile command called in', interaction.guild ? 'guild' : 'DM');
    const subcommand = interaction.options.getSubcommand();

    // ----------- VIEW -----------
    if (subcommand === 'view') {
      const user = interaction.options.getUser('user') || interaction.user;
      const profile = await Profile.findOne({ userId: user.id });

      if (!profile) {
        const noProfileEmbed = new EmbedBuilder()
          .setColor('#ff6f61')
          .setDescription(`${user.id === interaction.user.id ? 'You have' : `${user.username} has`} not set a profile yet.${user.id === interaction.user.id ? ' Use \`/profile set\` to create one!' : ''}`);
        return interaction.reply({ embeds: [noProfileEmbed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Book Profile`)
        .setColor('#4ac4d7')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: `${customEmoji} Bio`, value: profile.bio || 'Not set', inline: false },
          { name: `${customEmoji} Intention`, value: profile.intention || 'Not set', inline: false },
          { name: `${customEmoji} Affirmation`, value: profile.affirmation || 'Not set', inline: false },
          { name: `${customEmoji} Current Read`, value: profile.currentRead || 'Not set', inline: false },
          { name: `${customEmoji} Reading Goal`, value: profile.readingGoal ? profile.readingGoal.toString() : 'Not set', inline: false },
          { name: `${customEmoji} Favorite Genre`, value: profile.favoriteGenre || 'Not set', inline: false },
          { name: `${customEmoji} Preferred Format`, value: profile.preferredFormat || 'Not set', inline: false },
          { name: `${customEmoji} Favorite Author`, value: profile.favoriteAuthor || 'Not set', inline: false },
          { name: `${customEmoji} Member Since`, value: formatDate(profile.memberSince), inline: false }
        );

        if (profile.giftListUrl) {
        embed.addFields({
        name: `${customEmoji} Gift List`,
        // Format the URL as a hyperlink using Markdown [Text](URL)
        value: `[Gift List](${profile.giftListUrl})`,
        inline: true // Keeping it inline: false based on your structure
      });
      return interaction.reply({ embeds: [embed] });
    }
  }

    // ----------- SET -----------
    if (subcommand === 'set') {
      const userId = interaction.user.id;
      const bio = interaction.options.getString('bio');
      const intention = interaction.options.getString('intention');
      const affirmation = interaction.options.getString('affirmation');
      const currentRead = interaction.options.getString('current_read');
      const readingGoal = interaction.options.getString('reading_goal');
      const favoriteGenre = interaction.options.getString('favorite_genre');
      const preferredFormat = interaction.options.getString('preferred_format');
      const favoriteAuthor = interaction.options.getString('favorite_author');
      const giftListUrl = interaction.options.getString('gift_list_url');

      let profile = await Profile.findOne({ userId });
      if (!profile) {
        profile = new Profile({ userId });
      }
      profile.bio = bio;
      profile.intention = intention;
      profile.affirmation = affirmation;
      profile.currentRead = currentRead;
      profile.readingGoal = readingGoal;
      profile.favoriteGenre = favoriteGenre;
      profile.preferredFormat = preferredFormat;
      profile.favoriteAuthor = favoriteAuthor;
      profile.giftListUrl = giftListUrl;
      if (!profile.memberSince) profile.memberSince = new Date();

      await profile.save();

      const embed = new EmbedBuilder()
        .setColor('#4ac4d7')
        .setTitle('Profile Set!')
        .setDescription('Your profile has been created or updated successfully.');
      return interaction.reply({ embeds: [embed] });
    }

    // ----------- EDIT -----------
    if (subcommand === 'edit') {
      const userId = interaction.user.id;
      let profile = await Profile.findOne({ userId });

      if (!profile) {
        const noProfileEmbed = new EmbedBuilder()
          .setColor('#ff6f61')
          .setDescription('You do not have a profile yet. Use `/profile set` to create one!');
        return interaction.reply({ embeds: [noProfileEmbed], ephemeral: true });
      }

      // Only update fields that are provided
      const bio = interaction.options.getString('bio');
      const intention = interaction.options.getString('intention');
      const affirmation = interaction.options.getString('affirmation');
      const currentRead = interaction.options.getString('current_read');
      const readingGoal = interaction.options.getString('reading_goal');
      const favoriteGenre = interaction.options.getString('favorite_genre');
      const preferredFormat = interaction.options.getString('preferred_format');
      const favoriteAuthor = interaction.options.getString('favorite_author');
      const giftListUrl = interaction.options.getString('gift_list_url');

      let updated = false;

      if (bio !== null) { profile.bio = bio; updated = true; }
      if (intention !== null) { profile.intention = intention; updated = true; }
      if (affirmation !== null) { profile.affirmation = affirmation; updated = true; }
      if (currentRead !== null) { profile.currentRead = currentRead; updated = true; }
      if (readingGoal !== null) { profile.readingGoal = readingGoal; updated = true; }
      if (favoriteGenre !== null) { profile.favoriteGenre = favoriteGenre; updated = true; }
      if (preferredFormat !== null) { profile.preferredFormat = preferredFormat; updated = true; }
      if (favoriteAuthor !== null) { profile.favoriteAuthor = favoriteAuthor; updated = true; }
      if ( giftListUrl !== null ) { profile.giftListUrl = giftListUrl; updated = true; }

      if (!updated) {
        const noUpdateEmbed = new EmbedBuilder()
          .setColor('#ff6f61')
          .setDescription('You must provide at least one field to update.');
        return interaction.reply({ embeds: [noUpdateEmbed], ephemeral: true });
      }

      await profile.save();

      const embed = new EmbedBuilder()
        .setColor('#4ac4d7')
        .setTitle('Profile Updated!')
        .setDescription('Your profile has been updated successfully.');
      return interaction.reply({ embeds: [embed] });
    }
  }
};