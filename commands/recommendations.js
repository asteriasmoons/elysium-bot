const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RecommendationPreferences = require('../models/RecommendationPreferences');
const RecommendationHistory = require('../models/RecommendationHistory'); // For the /get command if we want to avoid repeats
const { fetchPreferredBook } = require('../utils/getBookRecommendation'); // Ensure path is correct

function getAgendaInterval(interval) {
  switch (interval) {
    case 'daily': return '1 day';
    case 'weekly': return '1 week';
    case 'monthly': return '1 month';
    default: return '1 week'; // Default to weekly if somehow an invalid value is passed
  }
}

async function rescheduleRecommendationJob(agenda, userId, interval) {
  try {
    await agenda.cancel({ name: 'send-book-recommendation', 'data.userId': userId });
    console.log(`[Reschedule] Cancelled existing job for ${userId} (if any).`);
    if (interval && interval !== 'none' && interval !== null) { // Ensure interval is valid
      const agendaInterval = getAgendaInterval(interval);
      await agenda.every(agendaInterval, 'send-book-recommendation', { userId });
      console.log(`[Reschedule] Job rescheduled for ${userId} with interval ${interval} (${agendaInterval}).`);
    } else {
      console.log(`[Reschedule] Recommendation job NOT scheduled for ${userId} (interval is 'none' or null).`);
    }
  } catch (error) {
    console.error(`[Reschedule] Error rescheduling job for ${userId}:`, error);
  }
}

async function getOrCreatePrefs(userId) {
  let prefs = await RecommendationPreferences.findOne({ userId });
  if (!prefs) {
    prefs = await RecommendationPreferences.create({
      userId,
      genres: ['fantasy'], // Default genres
      languages: ['en'],   // Default languages (using 'en' as per ISO 639-1 standard)
      interval: 'weekly',
      notify: 'dm'
    });
    console.log(`[Prefs] Created new default preferences for ${userId}`);
  }
  return prefs;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Manage your book recommendation preferences')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set all your preferences at once (use "none" for interval to stop DMs)')
        .addStringOption(opt =>
          opt.setName('interval')
            .setDescription('How often? daily, weekly, monthly, or none to disable')
            .setRequired(false)
            .addChoices(
              { name: 'Daily', value: 'daily' },
              { name: 'Weekly', value: 'weekly' },
              { name: 'Monthly', value: 'monthly' },
              { name: 'None (Disable DMs)', value: 'none' }
            )
        )
        .addStringOption(opt =>
          opt.setName('genres')
            .setDescription('Comma separated genres (e.g. fantasy, sci-fi). Clears existing if used.')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('notify')
            .setDescription('How to notify you for scheduled recommendations?')
            .setRequired(false)
            .addChoices(
              { name: 'Direct Message', value: 'dm' },
              { name: 'Channel', value: 'channel' }
            )
        )
        .addStringOption(opt =>
          opt.setName('language')
            .setDescription('Comma separated ISO codes (e.g. en, fr). Clears existing if used.')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show your current preferences')
    )
    .addSubcommand(sub =>
      sub.setName('interval')
        .setDescription('Set recommendation interval (daily, weekly, monthly, or none)')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Interval: daily, weekly, monthly, or none to disable DMs')
            .setRequired(true)
            .addChoices(
              { name: 'Daily', value: 'daily' },
              { name: 'Weekly', value: 'weekly' },
              { name: 'Monthly', value: 'monthly' },
              { name: 'None (Disable DMs)', value: 'none' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('genres')
        .setDescription('Set preferred genres (comma separated, e.g., fantasy, sci-fi)')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Comma separated genres. This will overwrite existing genres.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('notify')
        .setDescription('Set notification method for scheduled recommendations (DM or Channel)')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('How to notify you?')
            .setRequired(true)
            .addChoices(
              { name: 'Direct Message', value: 'dm' },
              { name: 'Channel (current channel will be used)', value: 'channel' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('language')
        .setDescription('Set preferred languages (comma separated ISO codes, e.g., en, fr)')
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Comma separated ISO codes. This will overwrite existing languages.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('get')
        .setDescription('Get a new book recommendation now based on your preferences')
    ),

  async execute(interaction, agenda) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    // Helper to update preferences
    async function updatePrefs(updateData, triggerAgendaReschedule = false) {
      const currentPrefs = await getOrCreatePrefs(userId); // Get current to see if interval changes
      let newInterval = currentPrefs.interval;

      if ('interval' in updateData) {
        newInterval = updateData.interval;
      }

      // Ensure genres and languages are processed correctly if provided
      if ('genres' in updateData) {
        if (updateData.genres && typeof updateData.genres === 'string') {
          updateData.genres = updateData.genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
        } else if (!updateData.genres) { // Handle empty string or null for genres by setting to empty array
          updateData.genres = [];
        }
      }
      if ('languages' in updateData) {
        if (updateData.languages && typeof updateData.languages === 'string') {
          updateData.languages = updateData.languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
        } else if (!updateData.languages) { // Handle empty string or null for languages
          updateData.languages = [];
        }
      }

      const updatedPrefs = await RecommendationPreferences.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { upsert: true, new: true }
      );

      if (triggerAgendaReschedule) {
        await rescheduleRecommendationJob(agenda, userId, newInterval);
      }
      return updatedPrefs;
    }

    if (subcommand === 'set') {
      await interaction.deferReply({ ephemeral: false });

      const intervalInput = interaction.options.getString('interval');
      const genresInput = interaction.options.getString('genres');
      const notifyInput = interaction.options.getString('notify');
      const languageInput = interaction.options.getString('language');

      let updatePayload = {};
      let changes = [];
      let needsReschedule = false;

      if (intervalInput !== null) {
        updatePayload.interval = intervalInput;
        changes.push(`**Interval:** ${intervalInput === 'none' ? 'None (Scheduled DMs Disabled)' : intervalInput}`);
        needsReschedule = true; // Interval change always triggers reschedule logic
      }
      if (genresInput !== null) { // User provided genres (even if empty string)
        updatePayload.genres = genresInput.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
        changes.push(`**Genres:** ${updatePayload.genres.join(', ') || 'None (Cleared)'}`);
      }
      if (languageInput !== null) { // User provided languages
        updatePayload.languages = languageInput.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
        changes.push(`**Languages:** ${updatePayload.languages.join(', ') || 'None (Cleared)'}`);
      }
      if (notifyInput !== null) {
        updatePayload.notify = notifyInput;
        changes.push(`**Notify Method:** ${notifyInput === 'dm' ? 'Direct Message' : 'Channel'}`);
        if (notifyInput === 'channel') {
          updatePayload.channelId = interaction.channel.id;
          changes.push(`**Notification Channel:** <#${interaction.channel.id}>`);
        } else {
          updatePayload.channelId = null; // Clear channelId if switching to DM
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        return interaction.editReply({ content: 'You didn\'t provide any preferences to set. Use `/recommend show` to see current settings.' });
      }

      await updatePrefs(updatePayload, needsReschedule);

      const embed = new EmbedBuilder()
        .setTitle('Preferences Updated')
        .setColor('#663399')
        .setDescription(`Your recommendation preferences have been updated:\n${changes.join('\n')}`);
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'show') {
      await interaction.deferReply({ ephemeral: false });
      const prefs = await getOrCreatePrefs(userId);

      const embed = new EmbedBuilder()
        .setTitle(`Your Book Recommendation Preferences`)
        .setColor('#663399')
        .addFields(
          { name: 'Genres', value: prefs.genres && prefs.genres.length > 0 ? prefs.genres.join(', ') : 'Not set (defaults to fantasy)', inline: false },
          { name: 'Languages', value: prefs.languages && prefs.languages.length > 0 ? prefs.languages.join(', ') : 'Not set (defaults to English - "en")', inline: false },
          { name: 'Interval for DMs', value: prefs.interval && prefs.interval !== 'none' ? prefs.interval : 'None (Disabled)', inline: true },
          { name: 'Notify Method (for DMs)', value: prefs.notify === 'channel' && prefs.channelId ? `Channel (<#${prefs.channelId}>)` : 'Direct Message', inline: true }
        )
        .setFooter({text: "Use /recommend set or other subcommands to change these."});
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'interval') {
      await interaction.deferReply({ ephemeral: false });
      const value = interaction.options.getString('value');
      await updatePrefs({ interval: value }, true); // Reschedule based on new interval
      const embed = new EmbedBuilder()
        .setTitle('Interval Updated')
        .setColor('#663399')
        .setDescription(`Your recommendation interval has been set to **${value === 'none' ? 'None (Scheduled DMs Disabled)' : value}**.`);
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'genres') {
      await interaction.deferReply({ ephemeral: false });
      const value = interaction.options.getString('value');
      const genres = value.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
      await updatePrefs({ genres });
      const embed = new EmbedBuilder()
        .setTitle('Genres Updated')
        .setColor('#663399')
        .setDescription(`Your preferred genres have been set to: **${genres.join(', ') || 'None (Cleared)'}**.`);
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'notify') {
      await interaction.deferReply({ ephemeral: true });
      const value = interaction.options.getString('value');
      let updatePayload = { notify: value };
      let description = `Scheduled notifications will now be sent via **Direct Message**.`;
      if (value === 'channel') {
        updatePayload.channelId = interaction.channel.id;
        description = `Scheduled notifications will now be sent to channel <#${interaction.channel.id}>.`;
      } else {
        updatePayload.channelId = null; // Clear channelId if DM
      }
      await updatePrefs(updatePayload);
      const embed = new EmbedBuilder()
        .setTitle('Notification Method Updated')
        .setColor('#663399')
        .setDescription(description);
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'language') {
      await interaction.deferReply({ ephemeral: false });
      const value = interaction.options.getString('value');
      const languages = value.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
      await updatePrefs({ languages });
      const embed = new EmbedBuilder()
        .setTitle('Languages Updated')
        .setColor('#663399')
        .setDescription(`Your preferred languages have been set to: **${languages.join(', ') || 'None (Cleared)'}**.`);
      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'get') {
      await interaction.deferReply(); // Public reply
      const prefs = await getOrCreatePrefs(userId);

      console.log(`[/recommend get] User ${userId} preferences: Genres: ${prefs.genres?.join(', ') || 'Default'}, Languages: ${prefs.languages?.join(', ') || 'Default'}`);

      // For `/get`, we usually don't need to check history, user wants one *now*.
      // If you wanted to avoid *very* recent DM'd books, you could fetch a small history:
      // const userHistory = await RecommendationHistory.find({ userId }).sort({ recommendedAt: -1 }).limit(5);
      // const recentlySentKeys = userHistory.map(h => h.bookKey);
      // const rec = await fetchPreferredBook(prefs, recentlySentKeys);
      const rec = await fetchPreferredBook(prefs);

      if (!rec) {
        let message = "Sorry, I couldn't find any book recommendations right now based on your current preferences.";
        message += `\n\n**Your Preferences:**`;
        message += `\n- Genres: ${prefs.genres && prefs.genres.length > 0 ? prefs.genres.join(', ') : 'Default (fantasy)'}`;
        message += `\n- Languages: ${prefs.languages && prefs.languages.length > 0 ? prefs.languages.join(', ') : 'Default (en)'}`;
        message += "\n\nTry adding more genres or broader ones with `/recommend genres value: your,genres,here` or changing languages with `/recommend language value: en,fr`."
        return interaction.editReply({ content: message });
      }

      // Optional: Save this "on-demand" recommendation to history.
      // This is useful if you want to avoid it in future DMs or even future /get commands if called soon after.
      // However, it might be overkill for a simple /get.
      // await RecommendationHistory.findOneAndUpdate(
      //   { userId, bookKey: rec.key },
      //   { userId, bookKey: rec.key, genre: rec.genre, language: rec.language, recommendedAt: new Date() },
      //   { upsert: true }
      // );

      const embed = new EmbedBuilder()
        .setTitle(rec.title || "Unknown Title")
        .setURL(rec.link)
        .setDescription(rec.description || "No description available.")
        .addFields(
          { name: "Author", value: rec.author || "Unknown", inline: true },
          { name: "Genre (Matched)", value: rec.genre || "Unknown", inline: true },
          { name: "Language (Matched)", value: rec.language || "Unknown", inline: true }
        )
        .setColor('#663399')
        .setFooter({text: `Found based on your preferences. Use /recommend show to see them.`});

      if (rec.cover) {
        embed.setThumbnail(rec.cover);
      }
      if (rec.firstPublishYear && rec.firstPublishYear !== 'N/A') {
        embed.addFields({ name: "First Published", value: rec.firstPublishYear.toString(), inline: true });
      }

      await interaction.editReply({ embeds: [embed], content: "Here's a book recommendation for you:" });
    }
  }
};