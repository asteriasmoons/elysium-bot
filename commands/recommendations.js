const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('axios');
const RecommendationPreferences = require('../models/RecommendationPreferences');

// Fetch a real book recommendation from Open Library
async function fetchBookRecommendation(prefs) {
  // Use first preferred genre and language, or fallback
  const genre = (prefs.genres && prefs.genres[0]) || 'fantasy';
  const language = (prefs.languages && prefs.languages[0]) || 'eng';

  // Open Library subject search
  const url = `https://openlibrary.org/subjects/${encodeURIComponent(genre)}.json?limit=20&language=${encodeURIComponent(language)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.works || data.works.length === 0) return null;

  // Pick a random book from the results
  const book = data.works[Math.floor(Math.random() * data.works.length)];

  return {
    title: book.title,
    author: book.authors && book.authors.length ? book.authors[0].name : "Unknown",
    description: book.description ? (typeof book.description === 'string' ? book.description : book.description.value) : "No description provided.",
    genre: genre,
    language: language,
    link: `https://openlibrary.org${book.key}`,
    cover: book.cover_id ? `https://covers.openlibrary.org/b/id/${book.cover_id}-L.jpg` : null
  };
}

function getAgendaInterval(interval) {
  switch (interval) {
    case 'daily': return '1 day';
    case 'weekly': return '1 week';
    case 'monthly': return '1 month';
    default: return '1 week';
  }
}

async function rescheduleRecommendationJob(agenda, userId, interval) {
  await agenda.cancel({ name: 'send-book-recommendation', 'data.userId': userId });
  if (interval && interval !== 'none') {
    await agenda.every(getAgendaInterval(interval), 'send-book-recommendation', { userId });
  }
}

async function getOrCreatePrefs(userId) {
  let prefs = await RecommendationPreferences.findOne({ userId });
  if (!prefs) {
    prefs = await RecommendationPreferences.create({
      userId,
      genres: ['fantasy'],
      languages: ['eng'],
      interval: 'weekly',
      notify: 'dm'
    });
  }
  return prefs;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Manage your book recommendation preferences')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set all your preferences at once')
        .addStringOption(opt =>
          opt.setName('interval')
            .setDescription('How often? daily, weekly, monthly')
            .addChoices(
              { name: 'daily', value: 'daily' },
              { name: 'weekly', value: 'weekly' },
              { name: 'monthly', value: 'monthly' }
            )
        )
        .addStringOption(opt =>
          opt.setName('genres')
            .setDescription('Comma separated genres (e.g. fantasy, sci-fi)')
        )
        .addStringOption(opt =>
          opt.setName('notify')
            .setDescription('How to notify you?')
            .addChoices(
              { name: 'Direct Message', value: 'dm' },
              { name: 'Channel', value: 'channel' }
            )
        )
        .addStringOption(opt =>
          opt.setName('language')
            .setDescription('Comma separated ISO codes (e.g. eng, fre)')
        )
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show your current preferences')
    )
    .addSubcommand(sub =>
      sub.setName('interval')
        .setDescription('Set your recommendation interval')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Interval: daily, weekly, monthly')
            .setRequired(true)
            .addChoices(
              { name: 'daily', value: 'daily' },
              { name: 'weekly', value: 'weekly' },
              { name: 'monthly', value: 'monthly' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('genres')
        .setDescription('Set your preferred genres')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Comma separated genres (e.g. fantasy, sci-fi)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('notify')
        .setDescription('Set your notification method')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('How to notify you?')
            .setRequired(true)
            .addChoices(
              { name: 'Direct Message', value: 'dm' },
              { name: 'Channel', value: 'channel' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('language')
        .setDescription('Set your preferred languages')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Comma separated ISO codes (e.g. eng, fre)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('get')
        .setDescription('Get a new book recommendation based on your preferences')
    ),

  async execute(interaction, agenda) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    // Helper to update and reply
    async function updatePrefs(update, agendaField) {
      await RecommendationPreferences.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
      if (agendaField) {
        const newPrefs = await RecommendationPreferences.findOne({ userId });
        await rescheduleRecommendationJob(agenda, userId, newPrefs.interval);
      }
    }

    if (subcommand === 'set') {
      const interval = interaction.options.getString('interval');
      const genres = interaction.options.getString('genres');
      const notify = interaction.options.getString('notify');
      const language = interaction.options.getString('language');

      let update = {};
      let changes = [];

      if (interval) {
        update.interval = interval;
        changes.push(`**Interval:** ${interval}`);
      }
      if (genres) {
        update.genres = genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
        changes.push(`**Genres:** ${update.genres.join(', ')}`);
      }
      if (language) {
        update.languages = language.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
        changes.push(`**Languages:** ${update.languages.join(', ')}`);
      }
      if (notify) {
        update.notify = notify;
        changes.push(`**Notify:** ${notify === 'dm' ? 'Direct Message' : 'Channel'}`);
        if (notify === 'channel') {
          update.channelId = interaction.channel.id;
          changes.push(`**Channel:** <#${interaction.channel.id}>`);
        } else {
          update.channelId = undefined;
        }
      }

      if (Object.keys(update).length === 0) {
        return interaction.reply({ content: 'Please provide at least one option to set.' });
      }

      await updatePrefs(update, interval);

      const embed = new EmbedBuilder()
        .setTitle('Preferences Updated')
        .setColor('#8e44ad')
        .setDescription(`Your recommendation preferences have been updated:\n${changes.join('\n')}`);

      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'show') {
      let prefs = await getOrCreatePrefs(userId);

      const embed = new EmbedBuilder()
        .setTitle(`Your Recommendation Preferences`)
        .setColor('#8e44ad')
        .addFields(
          { name: 'Genres', value: prefs.genres?.join(', ') || 'None', inline: true },
          { name: 'Languages', value: prefs.languages?.join(', ') || 'None', inline: true },
          { name: 'Interval', value: prefs.interval || 'None', inline: true },
          { name: 'Notify', value: prefs.notify === 'channel' && prefs.channelId ? `Channel (<#${prefs.channelId}>)` : 'Direct Message', inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'interval') {
      const value = interaction.options.getString('value');
      await updatePrefs({ interval: value }, true);
      const embed = new EmbedBuilder()
        .setTitle('Interval Updated')
        .setColor('#8e44ad')
        .setDescription(`Your recommendation interval has been set to **${value}**.`);
      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'genres') {
      const value = interaction.options.getString('value');
      const genres = value.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
      await updatePrefs({ genres });
      const embed = new EmbedBuilder()
        .setTitle('Genres Updated')
        .setColor('#8e44ad')
        .setDescription(`Your genres have been set to: **${genres.join(', ')}**.`);
      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'notify') {
      const value = interaction.options.getString('value');
      let update = { notify: value };
      if (value === 'channel') {
        update.channelId = interaction.channel.id;
      } else {
        update.channelId = undefined;
      }
      await updatePrefs(update);
      const embed = new EmbedBuilder()
        .setTitle('Notification Method Updated')
        .setColor('#8e44ad')
        .setDescription(`Notifications will be sent via **${value === 'dm' ? 'Direct Message' : `Channel (<#${interaction.channel.id}>)`}**.`);
      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'language') {
      const value = interaction.options.getString('value');
      const languages = value.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
      await updatePrefs({ languages });
      const embed = new EmbedBuilder()
        .setTitle('Languages Updated')
        .setColor('#8e44ad')
        .setDescription(`Your languages have been set to: **${languages.join(', ')}**.`);
      await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'get') {
      const prefs = await getOrCreatePrefs(userId);

      const rec = await fetchBookRecommendation(prefs);

      if (!rec) {
        return interaction.reply({ content: "Sorry, no recommendations found for your preferences.", ephemeral: false });
      }

      const embed = new EmbedBuilder()
        .setTitle(rec.title)
        .setDescription(rec.description)
        .addFields(
          { name: "Author", value: rec.author || "Unknown", inline: true },
          { name: "Genre", value: rec.genre || "Unknown", inline: true },
          { name: "Language", value: rec.language || "Unknown", inline: true }
        )
        .setURL(rec.link)
        .setColor('#2ecc71');

      if (rec.cover) embed.setThumbnail(rec.cover);

      await interaction.reply({ embeds: [embed] });
    }
  }
};