const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show information about all book sprint commands!'),
  async execute(interaction) {
    // Embed 1: Command List
    const helpEmbed = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Book Bot Help')
      .setDescription('Welcome to BookBot Help Menu! In this menu you will find ALL the commands the bot has to offer. If you need to see more about a command group, use ``/help commandgroupname`` and you will get a new message with the commands and all their details. Thank you so much for choosing BookBot!')
      .addFields(
        { name: '</help:1368067383742304302>', value: 'This shows you these help menus with their buttons. Use the buttons to navigate.' },
        { name: '</report:1368067384107339871>', value: 'Use this command to directly send me feedback or bug reports!' }
      )
      .setColor('#69359c')
      .setFooter({ text: 'BookBot Help Menus' });

    // Embed 2: More Commands (Buddy Reads)
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 3: Commands (Channel)
      const channelCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Channel Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</channel set:1368067383742304300>', value: 'Set the current channel as the reading sprints channel to run the sprint commands' },
        { name: '</channel view:1368067383742304300>', value: 'View the channel that is set for doing reading sprints in with the sprints commands' },
        { name: '</channel reset:1368067383742304300>', value: 'Reset the channel settings for the bot in your server.' }
      )
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 4: Commands (Profile)
      const profileCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Profile Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</profile view:1368067383742304305>', value: 'View your book profile!' },
        { name: '</profile set:1368067383742304305>', value: 'Set up your book profile.' },
        { name: '</profile edit:1368067383742304305>', value: 'Edit any of the fields for your profile' }
      )
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 5: Commands (Progress)
      const progressCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Progress Commands' )
      .setColor('#69359c')
      .addFields(
        { name: '</progress log:1368067384107339869>', value: 'Log your reading progress by the current page number or chapter your on' },
        { name: '</progress streak:1368067384107339869>', value: 'See your progress streak!' },
        { name: '</progress history:1368067384107339869>', value: 'Show your progress history' },
        { name: '</progress leaderboard:1368067384107339869>', value: 'If multiple people have progress streaks and history you can also look at the streaks leaderboard with this command.' }
      )
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 6: Commands (Reminders) 
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 7: Commands (Reviews)
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 8: Commands (Sprints)
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 9: Commands (TBR)
      const tbrCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> TBR (To Be Read) Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</tbr add:1368067384107339875>', value: 'Add a book to your tbr list in the bot globally' },
        { name: '</tbr remove:1368067384107339875>', value: 'Remove a book from your tbr list globally' },
        { name: '</tbr list:1368067384107339875>', value: 'See your tbr list with this command' }
      )
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 10: Commands (Inventory)
      const inventoryCmds = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> Inventory Commands')
      .setColor('#69359c')
      .addFields(
        { name: '</inventory addbook:1368741890886860881>', value: 'Add a book to the bots book inventory' },
        { name: '</inventory listbooks:1368741890886860881>', value: 'View a list of the BookBots book inventory from across all of discord' },
        { name: '</inventory bookremove:1368741890886860881>', value: 'Admins and server owners only can remove books from the inventory' }
      )
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 11: Commands (Embeds)
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 12: Commands (Journal)
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
      .setFooter({ text: 'BookBot Help Menus' });

      // Embed 13: Commands (Recommendations)
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
      .setFooter({ text: 'BookBot Help Menus' });

    // Embed 14: How Sprints Work
    const howEmbed = new EmbedBuilder()
      .setTitle('<:xbuuke:1369320075126898748> How Book Sprints Work')
      .setColor('#69359c')
      .setDescription(
        `Book sprints are a fun way to read together and track your progress! When a sprint starts, join in by telling the bot what page you're currently on—this is your starting page. Once the sprint ends, submit the page you finished on. The bot will do the math and let you know how many pages you read during the sprint!\n\n` +
        `For example, if you start on page 25 and end on page 40, the bot will record that you read 15 pages. It's a great way to stay motivated and see how much you can read with friends!`
      )
      .setFooter({ text: 'BookBot Help Menus' });

      const embeds = [helpEmbed, moreCmdsEmbed, channelCmds, profileCmds, progressCmds, remindersCmds, reviewCmds, sprintCmds, tbrCmds, inventoryCmds, embedCmds, journalCmds, recommendCmds, howEmbed];

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
            time: 180000 // 3 minutes (as in your original code)
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

            try {
                await message.edit({ components: [disabledRow] });
                // If you prefer to remove buttons entirely after timeout:
                // await message.edit({ components: [] });
            } catch (error) {
                // Ignore error if the message was already deleted or is otherwise inaccessible
                // Discord API error code 10008 is "Unknown Message"
                if (error.code !== 10008) {
                    console.error("Error trying to edit message after help collector timed out:", error);
                }
            }
        });
      }
    }