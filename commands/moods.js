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
        // You'll add subcommands for 'stats' and 'remind' later
        // .addSubcommand(sub => sub.setName('stats').setDescription('View your mood statistics.'))
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
                    ephemeral: true,
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
                             await i.reply({content: 'An error occurred while processing your action.', ephemeral: true});
                           } catch (replyError) {
                             console.error("Error sending error reply in collector: ", replyError);
                           }
                        } else if (i.isMessageComponent()) {
                           try {
                             await i.followUp({content: 'An error occurred while processing your action.', ephemeral: true});
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
                    await interaction.reply({ content: 'There was an error trying to set up the mood log!', ephemeral: true });
                } else {
                     await interaction.followUp({ content: 'There was an error trying to set up the mood log!', ephemeral: true });
                }
            }
        }
        // ... other subcommands for 'stats' and 'remind' will go here ...
    }
};