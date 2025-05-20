const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show information about all book sprint commands!'),
  async execute(interaction) {
    // Embed 1: Command List
    const helpEmbed = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Elysium Bot Help')
      .setDescription('Welcome to Elysium bots help menu! In this menu you will find ALL the commands the bot has to offer. Click on a command to pull up the command in the commands center on mobile or if on desktop it will be placed in the channel where you can then hit send. Thank you so much for choosing Elysium!\n\nCheck out the documentation [here](https://asterias-moons.gitbook.io/elysium)')
      .addFields(
        { name: '</help:1368067383742304302>', value: 'This shows you these help menus with their buttons. Use the buttons to navigate.' },
        { name: '</report:1368067384107339871>', value: 'Use this command to directly send me feedback or bug reports!' },
        { name: '</giftlist:1371203722780344360>', value: 'A new command allowing you to announce your purchase off someones giftlist from their profile' },
        { name: '</donate:1372038436621520988>', value: 'The command to donate to Elysium bot to help with bot expenses.' }
      )
      .setColor('#69359c')
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 2: How Sprints Work
      const howEmbed = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> How Book Sprints Work')
      .setColor('#69359c')
      .setDescription('Book sprints are a fun way to read together and track your progress! When a sprint starts, join in by telling the bot what page youre currently on—this is your starting page. Once the sprint ends, submit the page you finished on. The bot will do the math and let you know how many pages you read during the sprint For example, if you start on page 25 and end on page 40, the bot will record that you read 15 pages. Its a great way to stay motivated and see how much you can read with friends!')
      .setFooter({ text: 'Elysium Help Menus' });

    // Embed 3: More Commands (Buddy Reads)
    const moreCmdsEmbed = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Buddy Reads Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</buddyread announce:1368067383742304299>', value: 'Make a global announcement that you are looking a reading buddy for a specific book.' },
        { name: '</buddyread announcements:1368067383742304299>', value: 'View the global announcements made all across discord in many servers to find someone to buddy with for a book!' },
        { name: '</buddyread search:1368067383742304299>', value: 'Search for a buddy for a specific book.' },
        { name: '</buddyread dm:1368067383742304299>', value: 'DM your paired reading buddy using this command in your DMs or in a channel' },
        { name: '</buddyread messages:1368067383742304299>', value: 'Look at your buddy reading messages history with all the people youve ever paired with or are paired with.' },
        { name: '</buddyread sessions:1368067383742304299>', value: 'View your active and past buddy reading sessions.' },
        { name: '</buddyread status:1368067383742304299>', value: 'View the status of your buddy reading session to see if its active or if youve possibly been unmatched.' },
        { name: '</buddyread finish:1368067383742304299>', value: 'Mark a buddy reads session between you and your buddy as finished. This marks the session finished for both parties.' },
        { name: '</buddyread leave:1368067383742304299>', value: 'Leave a buddy reading session for whatever reason with this command!' },
        { name: '</buddyread pair:1368067383742304299>', value: 'Use the ID on the announcements command to pair with a reading buddy.' },
        { name: '</buddyread delete:1368067383742304299>', value: 'Delete your buddy read announcement if you change your mind about reading a book.' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 4: Commands (Channel)
      const channelCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Channel Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</channel set sprints:1368067383742304300>', value: 'Set a channel for the sprint events youll host' },
        { name: '</channel set gifts:1368067383742304300>', value: 'Set a channel for where the giftlist announcements should go' },
        { name: '</channel view:1368067383742304300>', value: 'View the channel that is set for doing reading sprints in with the sprints commands' },
        { name: '</channel reset:1368067383742304300>', value: 'Reset the channel settings for the bot in your server.' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 5: Commands (Profile)
      const profileCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Profile Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</profile view:1368067383742304305>', value: 'View your book profile!' },
        { name: '</profile set:1368067383742304305>', value: 'Set up your book profile.' },
        { name: '</profile edit:1368067383742304305>', value: 'Edit any of the fields for your profile' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 6: Commands (Progress)
      const progressCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Progress Commands' )
      .setColor('#69359c')
      .addFields(
        { name: '</progress log:1368067384107339869>', value: 'Log your reading progress by the current page number or chapter your on' },
        { name: '</progress streak:1368067384107339869>', value: 'See your progress streak!' },
        { name: '</progress history:1368067384107339869>', value: 'Show your progress history' },
        { name: '</progress leaderboard:1368067384107339869>', value: 'If multiple people have progress streaks and history you can also look at the streaks leaderboard with this command.' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 7: Commands (Reminders) 
      const remindersCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Reminders Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</reminders set:1368067384107339870>', value: 'Set repeat reminders for reading or anything else if you wish!' },
        { name: '</reminders remove:1368067384107339870>', value: 'Remove a reminder or more from your set reminders list by id' },
        { name: '</reminders list:1368067384107339870>', value: 'List all your reminders using this command and get their index or id number incase you need to remove on or reschedule' },
        { name: '</reminders timezone:1368067384107339870>', value: 'Set your timezone for reminders using this command - it defaults to CST' },
        { name: '</reminders message:1368067384107339870>', value: 'Edit your reminder message using this command and the index or number of the reminder youd like to edit the message of' },
        { name: '</reminders reschedule:1368067384107339870>', value: 'Set a new time for your reminder to go off' },
        { name: '</reminders channel add:1368067384107339870>', value: 'Add a set channel as your server reminders channel' },
        { name: '</reminders channel remove:1368067384107339870>', value: 'Remove a channel from the set reminders channel list' },
        { name: '</reminders channel list:1368067384107339870>', value: 'Get a list of all the channels set for reminders in your server' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 8: Commands (Reviews)
      const reviewCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Review Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</review add:1368067384107339872>', value: 'Add a book review to the book bot globally.' },
        { name: '</review book:1368067384107339872>', value: 'List reviews by a books title' },
        { name: '</review author:1368067384107339872>', value: 'List reviews by an authors name' },
        { name: '</review edit:1368067384107339872>', value: 'Edit a book review that you submitted globally' },
        { name: '</review delete:1368067384107339872>', value: 'Delete your book review from the bot globally' },
        { name: '</review view:1368067384107339872>', value: 'View a review someone else or yourself made' },
        { name: '</review list:1368067384107339872>', value: 'List all the reviews ever submitted to the bot' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 9: Commands (Sprints)
      const sprintCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Sprint Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</sprint start:1368067384107339874>', value: 'Start a reading sprint with this command up to an hour in duration' },
        { name: '</sprint join:1368067384107339874>', value: 'Afer you or someone starts a sprint, join it with this command and your current page number' },
        { name: '</sprint finish:1368067384107339874>', value: 'This doesnt end the sprint, this is the command youll use to add the page you finished on right before the sprint does end' },
        { name: '</sprint timeleft:1368067384107339874>', value: 'Anyone can use this command to see how much time is left on an active sprint' },
        { name: '</sprint end:1368067384107339874>', value: 'Admins and server owners are the only ones who can end a sprint manually before its time' },
        { name: '</sprint leaderboard:1368067384107339874>', value: 'Use this to see the leaderboard at anytime to see where you are on the leaderboard' },
        { name: '</sprint set role:1368067384107339874>', value: 'Set the role to be pinged 5 minutes prior to sprint end and at sprint end!' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 10: Commands (TBR)
      const tbrCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> TBR (To Be Read) Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</tbr add:1368067384107339875>', value: 'Add a book to your tbr list in the bot globally' },
        { name: '</tbr remove:1368067384107339875>', value: 'Remove a book from your tbr list globally' },
        { name: '</tbr list:1368067384107339875>', value: 'See your tbr list with this command' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 11: Commands (Inventory)
      const inventoryCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Inventory Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</inventory addbook:1368741890886860881>', value: 'Add a book to the bots book inventory' },
        { name: '</inventory listbooks:1368741890886860881>', value: 'View a list of the BookBots book inventory from across all of discord' },
        { name: '</inventory bookremove:1368741890886860881>', value: 'Admins and server owners only can remove books from the inventory' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 12: Commands (Embeds)
      const embedCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Embed Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</embed create:1369010259745706015>', value: 'Create an embed with buttons!' },
        { name: '</embed edit:1369010259745706015>', value: 'Edit the embed by name with more buttons' },
        { name: '</embed delete:1369010259745706015>', value: 'Delete an embed by its unique name' },
        { name: '</embed send:1369010259745706015>', value: 'Send your embed by its unique name to any channel' },
        { name: '</embed view:1369010259745706015>', value: 'View your embed you created' },
        { name: '</embed list:1369010259745706015>', value: 'View a list of embeds by their unique names in your server' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 13: Commands (Habit)
      const habitCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Habit Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</habit add:1371896824612388984>', value: 'Add a habit to your habit tracker list.' },
        { name: '</habit list:1371896824612388984>', value: 'View a list of your habits youve set.' },
        { name: '</habit remove:1371896824612388984>', value: 'Remove a habit you no longer need!' },
        { name: '</habit stats:1371896824612388984>', value: 'Look at your streaks and statistics.' },
        { name: '</habit points:1371896824612388984>', value: 'Look at how many xp you have from completing habits.' },
        { name: '</habit reschedule:1371896824612388984>', value: 'Reschedule the time for one of your habits to a new time.' }
      )
      .setFooter({ text: 'Elysium Help Menus' })

      // Embed 14: Commands (Journal)
      const journalCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Journal Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</journal add:1369327881213448365>', value: 'Add an entry to your personal journal either in your DMs or in a server channel' },
        { name: '</journal list:1369327881213448365>', value: 'View a list of your journal entries' },
        { name: '</journal view:1369327881213448365>', value: 'View a full journal entry you made with the index number from your journal entries list' },
        { name: '</journal edit:1369327881213448365>', value: 'Edit a journal entry you submitted by its index number' },
        { name: '</journal delete:1369327881213448365>', value: 'Delete an entry by its index number if you no longer need or want it' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 15: Commands (Mood)
      const moodCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Mood Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</mood log:1371296341208334448>', value: 'Use this command to summon the mood logging feature' },
        { name: '</mood remind set:1371296341208334448>', value: 'Setup a mood reminder to come to your DMs to remind you to log your mood' },
        { name: '</mood remind off:1371296341208334448>', value: 'Turn off the mood reminder you set.' },
        { name: '</mood remind status:1371296341208334448>', value: 'Check and see if your mood reminder is set and on' },
        { name: '</mood stats:1371296341208334448>', value: 'View your mood statistics.' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      // Embed 16: Commands (Recommendations)
      const recommendCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Recommendation Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</recommend set:1370056697678397610>', value: 'Set all the settings for recommendations in one command' },
        { name: '</recommend show:1370056697678397610>', value: 'Show a list of your current book recommendations' },
        { name: '</recommend interval:1370056697678397610>', value: 'Set the interval for daily, weekly or monthly for when you are to get a book recommendation from the bot' },
        { name: '</recommend genres:1370056697678397610>', value: 'Set the genres that you want book recommendations for' },
        { name: '</recommend notify:1370056697678397610>', value: 'Set up wether your recommendations come to you in your DMs or a channel in the server that the bot is in' },
        { name: '</recommend language:1370056697678397610>', value: 'Set the preferred language youd like to receive book recommendations in' },
        { name: '</recommend get:1370056697678397610>', value: 'Get a book recommendation if you dont feel like waiting for the set interval' }
      )
      .setFooter({ text: 'Elysium Help Menus' });

      const embeds = [helpEmbed, howEmbed, moreCmdsEmbed, channelCmds, profileCmds, progressCmds, remindersCmds, reviewCmds, sprintCmds, tbrCmds, inventoryCmds, embedCmds, habitCmds, journalCmds, moodCmds, recommendCmds];

    // Embed navigation logic
    let currentPage = 0;
    const totalPages = embeds.length;

        // --- 3. Function to Generate Buttons Dynamically ---
        const generateButtonRow = (pageIndex) => {
            const row = new ActionRowBuilder();

            // Back Button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('back') // Your existing custom ID
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === 0) // Disable if on the first page
            );

            // Next Button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('next') // Your existing custom ID
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === totalPages - 1) // Disable if on the last page
            );

            return row;
        };

        // --- 4. Send the Initial Reply ---
        const message = await interaction.reply({
            embeds: [embeds[currentPage]],
            components: [generateButtonRow(currentPage)],
            fetchReply: true // Important to get the message object for the collector
        });

        // --- 5. Create the Message Component Collector ---
        const collector = message.createMessageComponentCollector({
            // Filter to ensure only the original command user can interact
            // and that the customId matches your buttons
            filter: (i) => (i.customId === 'back' || i.customId === 'next') && i.user.id === interaction.user.id,
            time: 300000 // 5 minutes 
        });

        collector.on('collect', async i => {
            // The filter should already prevent other users, but this is an explicit check if you remove/change the filter
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Only the command user can use these buttons!', ephemeral: true });
            }

            if (i.customId === 'next') {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                }
            } else if (i.customId === 'back') {
                if (currentPage > 0) {
                    currentPage--;
                }
            }

            // Update the message with the new page and buttons
            await i.update({
                embeds: [embeds[currentPage]],
                components: [generateButtonRow(currentPage)]
            });
        });

        collector.on('end', async (collected, reason) => {
            // When the collector stops (e.g., due to timeout), disable the buttons
            const disabledRow = new ActionRowBuilder();
            disabledRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('back_disabled')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary) // Changed to secondary to look disabled
                    .setDisabled(true)
            );
            disabledRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('next_disabled')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            // This whole block goes inside your: collector.on('end', async (collected, reason) => { ... });
            // Make sure 'disabledRow', 'interaction', and 'message' variables are defined and accessible here.
            // 'message' is the object from your initial: await interaction.reply({ ..., fetchReply: true });

        try {
        // 1. Try to fetch the channel using the channelId from the original message
        const channel = await interaction.client.channels.fetch(message.channelId).catch(err => {
        // Log if channel fetch itself fails, then return null to be handled below
        console.warn(`Failed to fetch channel ${message.channelId} directly: ${err.message}`);
        return null;
    });

      if (channel && channel.isTextBased()) { // Works for guild text channels and DM channels
        // 2. Try to fetch the message itself from the (potentially newly) fetched channel
      const freshMessage = await channel.messages.fetch(message.id).catch(err => {
        // Log if message fetch fails, then return null
      if (err.code !== 10008) { // Don't log an error if it's just "Unknown Message"
      console.warn(`Failed to fetch message ${message.id} from channel ${channel.id}: ${err.message}`);
            }
            return null;
        });

        if (freshMessage) {
            // 3. Now, edit the fresh (and confirmed existing) message object
            await freshMessage.edit({ components: [disabledRow] });
            console.log(`Successfully disabled buttons for help message ${freshMessage.id}`);
        } else {
            // This means channel.messages.fetch(message.id) returned null (or threw an error caught by its .catch)
            // It implies the message was likely deleted.
            console.log(`Help command message (ID: ${message.id}) could not be found in channel ${message.channelId} when collector ended. Might have been deleted by a user.`);
        }
    } else {
        // This means client.channels.fetch(message.channelId) returned null or the channel isn't text-based.
        console.log(`Channel (ID: ${message.channelId}) for help command message could not be fetched, is not text-based, or bot lost access when collector ended.`);
    }
} catch (error) { // This single catch block will handle errors from the 'try' block above
    if (error.code === 10008) { // Unknown Message (already handled by freshMessage being null, but good to have as a fallback)
        console.log(`Help command message (ID: ${message.id}) was already deleted before buttons could be disabled (Error 10008).`);
    } else if (error.code === 50007) { // Cannot send messages to this user (relevant for DMs)
        console.warn(`Could not edit message in DM for user ${interaction.user.id} (Message ID: ${message.id}, Channel: ${message.channelId}). They might have DMs closed or blocked the bot.`);
    } else if (error.code === 50001) { // Missing Access (e.g., bot kicked, channel permissions changed)
        console.error(`Missing access to channel ${message.channelId} when trying to disable help buttons (Error 50001 for Message ID: ${message.id}).`);
    } else if (error.code === 'ChannelNotCached' || (error.message && error.message.includes('ChannelNotCached'))) {
        console.warn(`Encountered ChannelNotCached for ${message.channelId} despite fetch attempt. This can happen if the channel truly became inaccessible. (Error: ${error.message}, Message ID: ${message.id})`);
    } else {
        // Log other unexpected errors
        console.error(`Unexpected error trying to edit message after help collector timed out (Message ID: ${message.id}, Channel ID: ${message.channelId}):`, error);
    }
}
    
// This whole block goes inside your: collector.on('end', async (collected, reason) => { ... });
// Make sure 'disabledRow', 'interaction', and 'message' variables are defined and accessible here.
// 'message' is the object from your initial: await interaction.reply({ ..., fetchReply: true });

// --- START OF THE TRY BLOCK ---
try {
  // 1. Try to fetch the channel using the channelId from the original message
  const channel = await interaction.client.channels.fetch(message.channelId).catch(err => {
      console.warn(`[CollectorEnd] Failed to fetch channel ${message.channelId} directly: ${err.message}`);
      return null; // Return null to be handled by the 'if (channel ...)' check below
  });

  if (channel && channel.isTextBased()) { // Works for guild text channels and DM channels
      // 2. Try to fetch the message itself from the (potentially newly) fetched channel
      const freshMessage = await channel.messages.fetch(message.id).catch(err => {
          // Don't log an error if it's just "Unknown Message" (10008), as it means the message was deleted.
          if (err.code !== 10008) {
              console.warn(`[CollectorEnd] Failed to fetch message ${message.id} from channel ${channel.id}: ${err.message}`);
          }
          return null; // Return null if message fetch fails
      });

      if (freshMessage) {
          // 3. Now, edit the fresh (and confirmed existing) message object
          await freshMessage.edit({ components: [disabledRow] }); // Ensure 'disabledRow' is defined
          console.log(`[CollectorEnd] Successfully disabled buttons for help message ${freshMessage.id}`);
      } else {
          // This means channel.messages.fetch(message.id) returned null (or threw an error caught by its .catch)
          // It implies the message was likely deleted by a user or another process.
          console.log(`[CollectorEnd] Help command message (ID: ${message.id}) could not be found in channel ${message.channelId}. Might have been deleted.`);
      }
  } else {
      // This means client.channels.fetch(message.channelId) returned null or the channel isn't text-based.
      console.log(`[CollectorEnd] Channel (ID: ${message.channelId}) for help message could not be fetched, is not text-based, or bot lost access.`);
  }
// --- END OF THE TRY BLOCK ---
} catch (error) { // <<< THIS CATCH NOW CORRECTLY FOLLOWS THE COMPLETED TRY BLOCK
  if (error.code === 10008) { // Unknown Message (This case is mostly handled by freshMessage being null, but good as a fallback)
      console.log(`[CollectorEnd] Help command message (ID: ${message.id}) was already deleted before buttons could be disabled (Error 10008).`);
  } else if (error.code === 50007) { // Cannot send messages to this user (relevant for DMs)
      console.warn(`[CollectorEnd] Could not edit message in DM for user ${interaction.user.id} (Message ID: ${message.id}, Channel: ${message.channelId}). They might have DMs closed or blocked the bot.`);
  } else if (error.code === 50001) { // Missing Access (e.g., bot kicked, channel permissions changed)
      console.error(`[CollectorEnd] Missing access to channel ${message.channelId} when trying to disable help buttons (Error 50001 for Message ID: ${message.id}).`);
  } else if (error.code === 'ChannelNotCached' || (error.message && error.message.includes('ChannelNotCached'))) {
      console.warn(`[CollectorEnd] Encountered ChannelNotCached for ${message.channelId} despite fetch attempt. (Error: ${error.message}, Message ID: ${message.id})`);
  } else {
      // Log other unexpected errors
      console.error(`[CollectorEnd] Unexpected error trying to edit message after help collector timed out (Message ID: ${message.id}, Channel ID: ${message.channelId}):`, error);
      }
    }
  });
    }
  }
// --- END OF THE CATCH BLOCK ---