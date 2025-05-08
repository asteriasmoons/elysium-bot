const SprintPingRole = require('./models/SprintPingRole');
const Sprint = require('./models/Sprint');
const Leaderboard = require('./models/Leaderboard');
const RecommendationPreferences = require('./models/RecommendationPreferences');
const RecommendationHistory = require('./models/RecommendationHistory');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = function initAgendaJobs(agenda, client) {
  // 5-Minute Warning
  agenda.define('sprint-5min-warning', async job => {
    const { sprintId, guildId, channelId } = job.attrs.data;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || !sprint.active) return;
    const channel = await client.channels.fetch(channelId);
    let content = '';
    if (guildId) {
      const pingRole = await SprintPingRole.findOne({ guildId });
      if (pingRole) content = `<@&${pingRole.roleId}>`;
    }
    await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setTitle('<a:zxpin3:1368804727395061760> 5 Minutes Left!')
          .setDescription('Only 5 minutes left in the sprint! Finish strong!')
          .setColor('#4ac4d7')
      ]
    });
  });

  // Sprint End
  agenda.define('sprint-end', async job => {
    const { sprintId, guildId, channelId } = job.attrs.data;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || !sprint.active) return;

    sprint.active = false;
    await sprint.save();

    // Update leaderboard
    for (const p of sprint.participants) {
      if (p.endingPages !== undefined && p.endingPages !== null) {
        const pagesRead = p.endingPages - p.startingPages;
        if (pagesRead > 0) {
          await Leaderboard.findOneAndUpdate(
            { userId: p.userId, guildId: guildId },
            { $inc: { totalPages: pagesRead } },
            { upsert: true }
          );
        }
      }
    }

    // Build results message
    let results = '';
    if (sprint.participants.length === 0) {
      results = 'No one joined this sprint!';
    } else {
      results = sprint.participants.map(p => {
        if (p.endingPages !== undefined && p.endingPages !== null) {
          const pagesRead = p.endingPages - p.startingPages;
          return `<@${p.userId}>: ${p.startingPages} → ${p.endingPages} (**${pagesRead} pages**)`;
        } else {
          return `<@${p.userId}>: started at ${p.startingPages}, did not submit ending page.`;
        }
      }).join('\n');
    }

    const channel = await client.channels.fetch(channelId);
    let content = '';
    if (guildId) {
      const pingRole = await SprintPingRole.findOne({ guildId });
      if (pingRole) content = `<@&${pingRole.roleId}>`;
    }
    await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setTitle('Sprint Finished! <a:zpopz:1366768293368827964>')
          .setDescription(`The reading sprint has ended!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
          .setColor('#4ac4d7')
      ]
    });
  });

  // ===========================
  // Book Recommendation Job
  // ===========================
  agenda.define('send-book-recommendation', async job => {
    const { userId } = job.attrs.data;
    const prefs = await RecommendationPreferences.findOne({ userId });
    if (!prefs) return;

    // Fetch history to avoid repeats
    const userHistory = await RecommendationHistory.find({ userId });
    const alreadySentBookKeys = userHistory.map(h => h.bookKey);

    // Try up to 5 times to find a new book that hasn't been sent
    let book = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      // Pick random genre/language from user's preferences
      const genre = prefs.genres[Math.floor(Math.random() * prefs.genres.length)];
      const language = prefs.languages[Math.floor(Math.random() * prefs.languages.length)];
      // Fetch books from Open Library
      const url = `https://openlibrary.org/subjects/${encodeURIComponent(genre)}.json?limit=50&language=${language}`;
      try {
        const res = await axios.get(url);
        const works = res.data.works || [];
        // Filter out already recommended
        const candidates = works.filter(w => !alreadySentBookKeys.includes(w.key));
        if (candidates.length === 0) continue;
        const randomBook = candidates[Math.floor(Math.random() * candidates.length)];
        book = {
          title: randomBook.title,
          author: randomBook.authors?.[0]?.name || 'Unknown',
          cover: randomBook.cover_id ? `https://covers.openlibrary.org/b/id/${randomBook.cover_id}-L.jpg` : null,
          openLibraryUrl: `https://openlibrary.org${randomBook.key}`,
          firstPublishYear: randomBook.first_publish_year || 'N/A',
          genre,
          language,
          key: randomBook.key
        };
        break;
      } catch (err) {
        continue; // Try again
      }
    }

    if (!book) return; // Could not find a new book

    // Save to history
    await RecommendationHistory.create({
      userId,
      bookKey: book.key,
      genre: book.genre,
      language: book.language
    });

    // Send recommendation
    const embed = new EmbedBuilder()
      .setTitle(book.title)
      .setURL(book.openLibraryUrl)
      .setDescription(
        `**Author:** ${book.author}\n` +
        `**Genre:** ${book.genre}\n` +
        `**Language:** ${book.language}\n` +
        `**Published:** ${book.firstPublishYear}`
      )
      .setColor('#8e44ad');
    if (book.cover) embed.setImage(book.cover);

    // DM or Channel
    if (prefs.notify === 'dm') {
      try {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [embed] });
      } catch (err) {
        // DM failed, optionally log
      }
    } else if (prefs.notify === 'channel' && prefs.channelId) {
      try {
        const channel = await client.channels.fetch(prefs.channelId);
        await channel.send({ content: `<@${userId}>`, embeds: [embed] });
      } catch (err) {
        // Channel send failed, optionally log
      }
    }

    // Update lastSent
    prefs.lastSent = new Date();
    await prefs.save();
  });
};