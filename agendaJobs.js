// agendaJobs.js
const SprintPingRole = require('./models/SprintPingRole');
const Sprint = require('./models/Sprint');
const Leaderboard = require('./models/Leaderboard'); // Assuming you still use this
const RecommendationPreferences = require('./models/RecommendationPreferences');
const RecommendationHistory = require('./models/RecommendationHistory');
const { EmbedBuilder } = require('discord.js');

// Import the new utility function from utils/getBookRecommendation.js
const { fetchPreferredBook } = require('./utils/getBookRecommendation'); // Adjust path if necessary

module.exports = function initAgendaJobs(agenda, client) {
  // ===========================
  // Sprint 5 Minute Warning Job
  // ===========================
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
          return `<@${p.userId}>: ${p.startingPages} → ${p.endingPages} (**$
{pagesRead} pages**)`;
        } else {
          return `<@${p.userId}>: started at ${p.startingPages}, did not submit 
ending page.`;
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
          .setDescription(`The reading sprint has ended!\n\n__**Results:**__\n$
{results}\n\nUse \`/sprint start\` to begin another.`)
          .setColor('#4ac4d7')
      ]
    });
});

  // ===========================
  // Book Recommendation Job
  // ===========================
  agenda.define('send-book-recommendation', { priority: 'low', concurrency: 3 }, async job => {
    const { userId } = job.attrs.data;
    if (!userId) {
        console.error("[AgendaJob/BookRec] Job data missing userId. Cannot proceed.");
        job.fail("Missing userId in job data"); // Fail the job so it can be inspected
        return;
    }
    console.log(`[AgendaJob/BookRec] Starting 'send-book-recommendation' for userId: ${userId}`);

    const prefs = await RecommendationPreferences.findOne({ userId });
    if (!prefs) {
      console.warn(`[AgendaJob/BookRec] No preferences found for userId: ${userId}. Job will not run. Cancelling future jobs for this user.`);
      await agenda.cancel({ name: 'send-book-recommendation', 'data.userId': userId });
      return;
    }

    if (prefs.notify === 'none' || !prefs.interval || prefs.interval === 'none') {
        console.log(`[AgendaJob/BookRec] Notifications are off (interval: ${prefs.interval}, notify: ${prefs.notify}) for userId: ${userId}. Skipping.`);
        return;
    }

    // Fetch history to avoid repeats (e.g., last 20 books recommended to this user)
    const userHistory = await RecommendationHistory.find({ userId }).sort({ recommendedAt: -1 }).limit(20);
    const alreadySentBookKeys = userHistory.map(h => h.bookKey);
    console.log(`[AgendaJob/BookRec] User ${userId} has ${alreadySentBookKeys.length} books in recent history to avoid.`);

    // Use the new utility function from utils/getBookRecommendation.js
    const book = await fetchPreferredBook(prefs, alreadySentBookKeys);

    if (!book) {
      console.warn(`[AgendaJob/BookRec] Could not find a new book for userId: ${userId} after checking preferences (Genres: ${prefs.genres?.join(', ')}, Langs: ${prefs.languages?.join(', ')}) and history. No recommendation will be sent this time.`);
      // Optionally, send a message to the user that no new book could be found this time, but this might be spammy.
      // For now, we just log it and the job completes without sending.
      return;
    }

    console.log(`[AgendaJob/BookRec] Found book "${book.title}" (Key: ${book.key}, Genre: ${book.genre}, Lang: ${book.language}) for userId: ${userId}`);

    // Save to history to prevent recommending the same book again soon
    try {
        await RecommendationHistory.findOneAndUpdate(
            { userId: userId, bookKey: book.key }, // Query to find existing or create new
            { // Data to insert/update
                userId: userId,
                bookKey: book.key,
                title: book.title, // Store title for easier review of history
                genre: book.genre, // The actual genre that resulted in the find
                language: book.language, // The actual language
                recommendedAt: new Date()
            },
            { upsert: true, new: true } // Options: create if not exists, return new doc
        );
        console.log(`[AgendaJob/BookRec] Saved book "${book.title}" to history for userId: ${userId}`);
    } catch(historyError) {
        console.error(`[AgendaJob/BookRec] Failed to save book "${book.title}" to history for userId ${userId}:`, historyError);
        // Continue to send, as fetching worked.
    }


    const embed = new EmbedBuilder()
      .setTitle(`📚 Your Scheduled Book Recommendation: ${book.title}`)
      .setURL(book.link)
      .setDescription(book.description || "No description available.")
      .addFields(
        { name: "Author", value: book.author || "Unknown", inline: true },
        { name: "Matched Genre", value: book.genre, inline: true },
        { name: "Matched Language", value: book.language, inline: true }
      )
      .setColor(prefs.notify === 'dm' ? '#8e44ad' : '#1abc9c') // Different color for DM vs Channel
      .setFooter({ text: "Want to change your preferences? Use /recommend set" });

    if (book.cover) {
      embed.setThumbnail(book.cover);
    }
    if (book.firstPublishYear && book.firstPublishYear !== 'N/A') {
        embed.addFields({ name: "First Published", value: book.firstPublishYear.toString(), inline: true });
    }

    let sent = false;
    if (prefs.notify === 'dm') {
      try {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [embed] });
        sent = true;
        console.log(`[AgendaJob/BookRec] Sent DM recommendation for "${book.title}" to userId: ${userId}`);
      } catch (err) {
        console.error(`[AgendaJob/BookRec] Failed to send DM to userId: ${userId}. Error: ${err.message} (Code: ${err.code})`);
        if (err.code === 50007) { // Cannot send messages to this user (DMs disabled, blocked, etc.)
            console.warn(`[AgendaJob/BookRec] User ${userId} might have DMs disabled. Consider updating their prefs to notify: 'none' or 'channel' if this persists.`);
            // Optionally, update prefs to notify: 'none' automatically after several failures.
            // For now, we just log. The job will still be scheduled.
        }
      }
    } else if (prefs.notify === 'channel' && prefs.channelId) {
      try {
        const channel = await client.channels.fetch(prefs.channelId);
        if (channel && channel.isTextBased()) {
            // Check bot permissions in the target channel
            const permissions = channel.permissionsFor(client.user);
            if (permissions && permissions.has("SendMessages") && permissions.has("EmbedLinks")) {
                await channel.send({ content: `Hey <@${userId}>, here's your scheduled book recommendation!`, embeds: [embed] });
                sent = true;
                console.log(`[AgendaJob/BookRec] Sent channel recommendation for "${book.title}" to channel ${prefs.channelId} for userId: ${userId}`);
            } else {
                 console.error(`[AgendaJob/BookRec] Cannot send to channel ${prefs.channelId}: Missing SendMessages or EmbedLinks permission.`);
            }
        } else {
            console.error(`[AgendaJob/BookRec] Cannot send to channel ${prefs.channelId}: Not found, or not a text-based channel.`);
        }
      } catch (err) {
        console.error(`[AgendaJob/BookRec] Failed to fetch or send channel message to ${prefs.channelId} for userId: ${userId}. Error: ${err.message}`);
      }
    } else {
        console.warn(`[AgendaJob/BookRec] User ${userId} has notify method '${prefs.notify}' but channelId is missing or invalid. Cannot send recommendation.`);
    }

    if (sent) {
      prefs.lastSent = new Date();
      try {
          await prefs.save();
          console.log(`[AgendaJob/BookRec] Updated lastSent timestamp for userId: ${userId}`);
      } catch (saveError) {
          console.error(`[AgendaJob/BookRec] Failed to update lastSent for userId ${userId}:`, saveError);
      }
    } else {
        console.warn(`[AgendaJob/BookRec] Recommendation for ${userId} (Book: "${book.title}") was generated but NOT sent due to notification issues or configuration.`);
    }
  });

  console.log('[Agenda] All jobs defined.');
};