// commands/mood.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const MoodLog = require('../models/MoodLog'); // Adjust path if needed
const { MessageFlagsBitField } = require('discord.js');
// const { DateTime } = require('luxon'); // Only if you need it for display in this command's replies

// --- Your Predefined Lists (Updated) ---
const CURATED_MOODS = [
    'Happy', 'Sad', 'Content', 'Energized', 'Lonely', 'Grateful', 'Relieved', 'Confident',
    'Amused', 'Anxious', 'Brave', 'Discouraged', 'Drained', 'Excited', 'Hopeful',
    'Hopeless', 'Indifferent', 'Irritated', 'Joyful', 'Overwhelmed', 'Passionate',
    'Satisfied', 'Surprised', 'Inspired', 'Affectionate'
]; // Total 25

const ALL_ACTIVITIES = [ // Your existing list of 23 activities
    'Health', 'Fitness', 'Self-Care', 'Hobbies', 'Identity', 'Spirituality', 'Community',
    'Family', 'Friends', 'Partner', 'Dating', 'Tasks', 'Work', 'Education', 'Travel',
    'Weather', 'Current Events', 'Money', 'Sleep', 'Creativity', 'Entertainment', 'Social', 'Chores'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mood')
        .setDescription('Track your moods and activities.')
        .addSubcommand(sub =>
            sub.setName('log')
            .setDescription('Log your current moods and activities.')
        )
		// In your commands/mood.js, add this to your SlashCommandBuilder data:
.addSubcommand(sub =>
    sub.setName('stats')
    .setDescription('View your mood and activity statistics.')
    .addStringOption(option =>
        option.setName('period')
            .setDescription('The period to view stats for (default: week)')
            .setRequired(false)
            .addChoices(
                { name: 'Today', value: 'today' },
                { name: 'Last 7 Days (Week)', value: 'week' },
                { name: 'Last 30 Days (Month)', value: 'month' },
                { name: 'All Time', value: 'alltime' }
        	  )
	       )
        )
        // You'll add subcommands for 'stats' and 'remind' later
        // .addSubcommand(sub => sub.setName('remind').setDescription('Set up mood logging reminders.'))
    ,
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'log') {
            try {
                const userId = interaction.user.id;
                const guildId = interaction.guild ? interaction.guild.id : null;

                const logEmbed = new EmbedBuilder()
                    .setColor('#663399')
                    .setTitle('<a:yzwing2:1368617156320690337> Mood & Activity Log <a:yzwing1:1368617125379309628>')
                    .setDescription(`Hey ${interaction.user.toString()}, great to see you focusing on your well-being!\nSelect your current mood(s) and any activities you've been doing.\n\n*Your emotional and physical health matter, and tracking can help build self-awareness.*`)
                    .setFooter({ text: 'You can select multiple options from each menu.' });

                // --- Mood Select Menu (Single Menu for 25 Moods) ---
                const moodSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`mood_log_moods_${userId}`) // Unique ID
                    .setPlaceholder('Select your mood(s)...')
                    .setMinValues(1) // Require at least one mood
                    .setMaxValues(CURATED_MOODS.length) // Allow selecting all 25
                    .addOptions(
                        CURATED_MOODS.map(mood =>
                            new StringSelectMenuOptionBuilder().setLabel(mood).setValue(mood)
                        )
                    );

                const activitiesSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`mood_log_activities_${userId}`)
                    .setPlaceholder('Select your activities (optional)...')
                    .setMinValues(0) // Allow selecting no activities
                    .setMaxValues(ALL_ACTIVITIES.length)
                    .addOptions(
                        ALL_ACTIVITIES.map(activity =>
                            new StringSelectMenuOptionBuilder().setLabel(activity).setValue(activity)
                        )
                    );

                const noteButton = new ButtonBuilder()
                    .setCustomId(`mood_log_add_note_${userId}`)
                    .setLabel('Add a Note (Optional)')
                    .setStyle(ButtonStyle.Secondary);

                const submitButton = new ButtonBuilder()
                    .setCustomId(`mood_log_submit_${userId}`)
                    .setLabel('Log Moods & Activities')
                    .setStyle(ButtonStyle.Secondary);

                const rowMoods = new ActionRowBuilder().addComponents(moodSelectMenu);
                const rowActivities = new ActionRowBuilder().addComponents(activitiesSelectMenu);
                const rowButtons = new ActionRowBuilder().addComponents(noteButton, submitButton);

                const message = await interaction.reply({
                    embeds: [logEmbed],
                    components: [rowMoods, rowActivities, rowButtons],
                    ephemeral: false,
                    fetchReply: true
                });

                let selectedMoods = [];
                let selectedActivities = [];
                let userNote = null;

                const collectorFilter = i => i.user.id === userId && i.message.id === message.id;
                const collector = message.createMessageComponentCollector({ filter: collectorFilter, time: 5 * 60 * 1000 }); // 5 minutes

                collector.on('collect', async i => {
                    try {
                        if (i.isStringSelectMenu()) {
                            if (i.customId === `mood_log_moods_${userId}`) {
                                selectedMoods = i.values; // Directly assign from the single mood menu
                                await i.deferUpdate();
                            } else if (i.customId === `mood_log_activities_${userId}`) {
                                selectedActivities = i.values;
                                await i.deferUpdate();
                            }
                        } else if (i.isButton()) {
                            if (i.customId === `mood_log_add_note_${userId}`) {
                                const modal = new ModalBuilder()
                                    .setCustomId(`mood_log_note_modal_${userId}_${Date.now()}`) // Ensure modal customId is unique per interaction
                                    .setTitle('Add a Private Note');
                                const noteInput = new TextInputBuilder()
                                    .setCustomId('note_input')
                                    .setLabel("Your thoughts or details (optional)")
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(false)
                                    .setMaxLength(1000);
                                const firstActionRow = new ActionRowBuilder().addComponents(noteInput);
                                modal.addComponents(firstActionRow);
                                await i.showModal(modal);

                                const submittedModal = await i.awaitModalSubmit({
                                    filter: modalInteraction => modalInteraction.customId === modal.data.custom_id && modalInteraction.user.id === userId,
                                    time: 4 * 60 * 1000 // 4 minutes to submit modal (slightly less than collector)
                                }).catch(err => {
                                    console.log(`Modal for note timed out or failed for user ${userId}. Note will be empty.`);
                                    userNote = null;
                                    // No reply needed here, user can still submit log
                                });

                                if (submittedModal) {
                                    userNote = submittedModal.fields.getTextInputValue('note_input');
                                    // Acknowledge modal submission.
                                    // Instead of deferUpdate which can sometimes be tricky after a modal,
                                    // send a quick ephemeral follow-up.
                                    await submittedModal.reply({ content: 'Note recorded! You can now submit your full mood log.', ephemeral: true });

                                    // Optionally update the original embed if you want to show "Note Added"
                                    // For simplicity, we'll just store the note and it will appear in the final confirmation.
                                }

                            } else if (i.customId === `mood_log_submit_${userId}`) {
                                // selectedMoods is already the final list from the single menu
                                if (selectedMoods.length === 0) {
                                    // This check might be redundant if minValues for moodSelectMenu is 1, but good for safety.
                                    await i.reply({ content: 'Please select at least one mood before submitting.', ephemeral: true });
                                    return;
                                }

                                await MoodLog.create({
                                    userId: userId,
                                    guildId: guildId,
                                    moods: selectedMoods,
                                    activities: selectedActivities.length > 0 ? selectedActivities : [],
                                    note: userNote
                                });

                                const confirmationEmbed = new EmbedBuilder()
                                    .setColor('#663399')
                                    .setTitle('Mood Logged Successfully!')
                                    .setDescription('Your moods, activities, and note (if any) have been recorded.')
                                    .addFields(
                                        { name: 'Moods', value: selectedMoods.join(', ') }, // No 'None selected' needed due to minValues(1)
                                        { name: 'Activities', value: selectedActivities.join(', ') || 'None selected' }
                                    )
                                    .setTimestamp();
                                if (userNote) {
                                    confirmationEmbed.addFields({ name: 'Your Note', value: userNote });
                                }

                                await i.update({ embeds: [confirmationEmbed], components: [] });
                                collector.stop('submitted');
                            }
                        }
                    } catch (error) {
                        console.error("Error in mood log collector:", error);
                        if (!i.replied && !i.deferred && i.isMessageComponent()) {
                           try {
                             await i.reply({content: 'An error occurred while processing your action.', ephemeral: false});
                           } catch (replyError) {
                             console.error("Error sending error reply in collector: ", replyError);
                           }
                        } else if (i.isMessageComponent()) {
                           try {
                             await i.followUp({content: 'An error occurred while processing your action.', ephemeral: false});
                           } catch (followUpError) {
                             console.error("Error sending error followup in collector: ", followUpError);
                           }
                        }
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason !== 'submitted') {
                        const disabledMoodRow = new ActionRowBuilder().addComponents(moodSelectMenu.setDisabled(true));
                        const disabledActivityRow = new ActionRowBuilder().addComponents(activitiesSelectMenu.setDisabled(true));
                        const disabledButtonRow = new ActionRowBuilder().addComponents(noteButton.setDisabled(true), submitButton.setDisabled(true));

                        interaction.editReply({ components: [disabledMoodRow, disabledActivityRow, disabledButtonRow] }).catch(err => {
                            if (err.code !== 10008) console.error("Error editing reply on mood log collector end:", err);
                        });
                    }
                });

            } catch (error) {
                console.error("Error executing mood log command:", error);
                 if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'There was an error trying to set up the mood log!', ephemeral: false });
                } else {
                     await interaction.followUp({ content: 'There was an error trying to set up the mood log!', ephemeral: false });
                }
            }
        } else if (subcommand === 'stats') {
            const userId = interaction.user.id;
            const guildId = interaction.guild ? interaction.guild.id : null; // null if in DMs
            const period = interaction.options.getString('period') || 'week'; // Default to 'week'

            let startDate;
            const now = DateTime.now(); // Use Luxon DateTime

            // Determine startDate based on the selected period
            // We'll calculate start dates in UTC for consistent querying,
            // as timestamps are stored in UTC by default by Mongoose.
            if (period === 'today') {
                startDate = now.setZone('utc').startOf('day');
            } else if (period === 'week') {
                startDate = now.setZone('utc').minus({ days: 7 }).startOf('day');
            } else if (period === 'month') {
                // Using 30 days for simplicity, you could also do start of current month
                startDate = now.setZone('utc').minus({ days: 30 }).startOf('day');
            } else { // 'alltime'
                startDate = null; // No start date needed for all time
            }

            // Build the MongoDB query
            const query = {
                userId: userId,
                guildId: guildId // This will correctly be null for DMs
            };

            if (startDate) {
                query.timestamp = { $gte: startDate.toJSDate() }; // Only need $gte for start of period up to now
            }
            // No $lte: now.toJSDate() is needed if we always want up to the current moment.
            // If you want to cap it at the end of 'today' for the 'today' period for example, you could add $lte.

            try {
                const logs = await MoodLog.find(query).sort({ timestamp: -1 }); // Get logs for the user/guild/period

                if (!logs || logs.length === 0) {
                    const location = guildId ? `in ${interaction.guild.name}` : "in your DMs";
                    const periodText = period === 'alltime' ? 'overall' : `for the ${period === 'week' ? 'last 7 days' : (period === 'month' ? 'last 30 days' : 'today')}`;
                    return interaction.reply({ content: `No mood logs found for you ${location} ${periodText}. Start logging with \`/mood log\`!`, ephemeral: false });
                }

                // --- Process Moods ---
                const moodCounts = {};
                let totalMoodSelections = 0; // Counts each mood selected in each log
                logs.forEach(log => {
                    if (log.moods && log.moods.length > 0) {
                        log.moods.forEach(mood => {
                            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
                            totalMoodSelections++;
                        });
                    }
                });

                // --- Process Activities ---
                const activityCounts = {};
                let totalActivitySelections = 0; // Counts each activity selected
                logs.forEach(log => {
                    if (log.activities && log.activities.length > 0) {
                        log.activities.forEach(activity => {
                            activityCounts[activity] = (activityCounts[activity] || 0) + 1;
                            totalActivitySelections++;
                        });
                    }
                });

                // --- Build the Embed ---
                const periodDisplayNames = {
                    today: "Today",
                    week: "Last 7 Days",
                    month: "Last 30 Days",
                    alltime: "All Time"
                };
                const displayPeriod = periodDisplayNames[period] || "Selected Period";
                const contextName = guildId ? `in ${interaction.guild.name}` : "in DMs";

                const statsEmbed = new EmbedBuilder()
                    .setColor(0x4CAF50) // A nice green for stats
                    .setTitle(`📊 Your Mood & Activity Stats (${displayPeriod})`)
                    .setDescription(`Showing your logged data ${contextName}.`)
                    .setTimestamp();

                // Moods Field
                let moodDescription = "No moods logged in this period.";
                if (totalMoodSelections > 0) {
                    const sortedMoods = Object.entries(moodCounts)
                        .sort(([, aCount], [, bCount]) => bCount - aCount) // Sort by count descending
                        .slice(0, 10); // Show top 10 moods to prevent huge embeds

                    moodDescription = sortedMoods
                        .map(([mood, count]) => {
                            const percentage = ((count / totalMoodSelections) * 100).toFixed(1);
                            return `**${mood}:** ${count} (${percentage}%)`;
                        })
                        .join('\n');
                    if (Object.keys(moodCounts).length > 10) {
                        moodDescription += "\n*...and more (showing top 10).*";
                    }
                }
                statsEmbed.addFields({ name: '🧠 Mood Distribution', value: moodDescription.substring(0,1024) }); // Max field value length 1024

                // Activities Field
                let activityDescription = "No activities logged in this period.";
                if (totalActivitySelections > 0) {
                    const sortedActivities = Object.entries(activityCounts)
                        .sort(([, aCount], [, bCount]) => bCount - aCount)
                        .slice(0, 10); // Show top 10 activities

                    activityDescription = sortedActivities
                        .map(([activity, count]) => {
                            const percentage = ((count / totalActivitySelections) * 100).toFixed(1);
                            return `**${activity}:** ${count} (${percentage}%)`;
                        })
                        .join('\n');
                    if (Object.keys(activityCounts).length > 10) {
                        activityDescription += "\n*...and more (showing top 10).*";
                    }
                }
                statsEmbed.addFields({ name: '🤸‍♀️ Activity Distribution', value: activityDescription.substring(0,1024) });

                await interaction.reply({ embeds: [statsEmbed], ephemeral: true });

            } catch (error) {
                console.error("Error fetching or processing mood stats:", error);
                await interaction.reply({ content: 'Sorry, I encountered an error trying to fetch your stats.', ephemeral: false });
            }
        }
	}
};