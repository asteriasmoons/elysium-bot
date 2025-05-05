const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const Reminder = require('../models/Reminder');
const ReminderConfig = require('../models/ReminderConfig');

const scheduled = {};

// --- Helper Functions for Channels ---

async function getReminderChannels(guildId) {
    if (!guildId) return [];
    let config = await ReminderConfig.findOne({ guildId });
    return config ? config.channelIds : [];
}

async function addReminderChannel(guildId, channelId) {
    if (!guildId || !channelId) return;
    await ReminderConfig.findOneAndUpdate(
        { guildId },
        { $addToSet: { channelIds: channelId } },
        { upsert: true }
    );
}

async function removeReminderChannel(guildId, channelId) {
    if (!guildId || !channelId) return;
    await ReminderConfig.findOneAndUpdate(
        { guildId },
        { $pull: { channelIds: channelId } }
    );
}

// SCHEDULE HELPERS

async function getUserReminders(userId) {
    return await Reminder.find({ userId });
}

async function scheduleAllReminders(client) {
    const reminders = await Reminder.find({});
    for (const reminder of reminders) {
        scheduleReminder(client, reminder);
    }
}
function scheduleReminder(client, reminder) {
    // Clear existing timeout if any
    if (reminder._timeout) clearTimeout(reminder._timeout);

    // Timezone support
    const now = DateTime.now().setZone(reminder.zone || 'UTC');
    let next = now.set({ hour: reminder.hour, minute: reminder.minute, second: 0, millisecond: 0 });
    if (next <= now) next = next.plus({ days: 1 });

    const msUntil = next.diff(now).as('milliseconds');

    // === Move the log here, after variables are defined ===
    console.log(
        `[SCHEDULE] User: ${reminder.userId} | Zone: ${reminder.zone} | Now: ${now.toISO()} | Next: ${next.toISO()} | msUntil: ${msUntil}`
    );

    reminder._timeout = setTimeout(async () => {
        console.log(
            `[TRIGGER] Reminder for user ${reminder.userId} triggered at ${DateTime.now().setZone(reminder.zone).toISO()} (should be at ${reminder.hour}:${reminder.minute} in ${reminder.zone})`
        );
        try {
            const guildId = reminder.guildId;
            const channelIds = await getReminderChannels(guildId);

            if (!channelIds.length) return; // No channels set, skip sending

            const embed = new EmbedBuilder()
                .setColor(0x572c86)
                .setTitle('<:xmail:1368803966304911371> Reminder!')
                .setDescription(reminder.text ? reminder.text : 'This is your reminder!');

				console.log(`[SEND] Attempting to send reminder to user ${reminder.userId} in channels:`, channelIds);
				console.log("[DEBUG] embed:", embed);

				for (const channelId of channelIds) {
					try {
						const channel = await client.channels.fetch(channelId);
						if (channel && channel.isTextBased()) {
							await channel.send({
								content: `<@${reminder.userId}>`,
								embeds: [embed]
							});
							console.log(`[SEND SUCCESS] Reminder sent to channel ${channelId}`);
						} else {
							console.error(`[SEND ERROR] Channel ${channelId} is not text-based or inaccessible.`);
						}
					} catch (e) {
						console.error(`[SEND ERROR] Could not send to channel ${channelId}:`, e);
					}				
			}

            // Reschedule for next day
            scheduleReminder(client, reminder);
        } catch (err) {
            console.error('Failed to send reminder:', err);
        }
    }, msUntil);

    scheduled[reminder.userId] = scheduled[reminder.userId] || [];
    scheduled[reminder.userId].push(reminder._timeout);
}

// COMMAND MODULE

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminders')
        .setDescription('Manage your daily reminders')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set a daily reminder')
                .addIntegerOption(option =>
                    option.setName('hour')
                        .setDescription('Hour (0-23)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('minute')
                        .setDescription('Minute (0-59)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Reminder message')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a reminder (by number)')
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('Reminder number (from /reminders list)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all your reminders'))
        .addSubcommand(sub =>
            sub.setName('timezone')
                .setDescription('Set your timezone')
                .addStringOption(option =>
                    option.setName('zone')
                        .setDescription('IANA timezone, e.g. America/New_York')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('Set the message for one of your reminders')
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('Reminder number (from /reminders list)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('The new reminder message')
                        .setRequired(true)))
		.addSubcommand(sub =>
			sub.setName('reschedule')
				.setDescription('Change the time of a reminder')
				.addIntegerOption(option =>
					option.setName('index')
						.setDescription('Reminder number (from /reminders list)')
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('hour')
						.setDescription('New hour (0-23)')
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('minute')
						.setDescription('New minute (0-59)')
						.setRequired(true)))						
        .addSubcommandGroup(group =>
            group.setName('channel')
                .setDescription('Manage reminder channels')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a channel to receive reminders')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('The channel to add')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a channel from reminder channels')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('The channel to remove')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all reminder channels')))
    ,
    async execute(interaction) {
        const client = interaction.client;
        const userId = interaction.user.id;
        const guildId = interaction.guild ? interaction.guild.id : null;

        // Handle channel subcommands first
        if (interaction.options.getSubcommandGroup(false) === 'channel') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'add') {
                const channel = interaction.options.getChannel('channel');
                await addReminderChannel(guildId, channel.id);
                await interaction.reply({ content: `Added <#${channel.id}> as a reminder channel!`, ephemeral: true });
            } else if (sub === 'remove') {
                const channel = interaction.options.getChannel('channel');
                await removeReminderChannel(guildId, channel.id);
                await interaction.reply({ content: `Removed <#${channel.id}> from reminder channels!`, ephemeral: true });
            } else if (sub === 'list') {
                const channelIds = await getReminderChannels(guildId);
                if (!channelIds.length)
                    return interaction.reply({ content: 'No reminder channels set.', ephemeral: true });
                const names = channelIds.map(id => `<#${id}>`).join('\n');
                await interaction.reply({ content: `Reminder channels:\n${names}`, ephemeral: true });
            }
            return;
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'set') {
            const hour = interaction.options.getInteger('hour');
            const minute = interaction.options.getInteger('minute');
            const text = interaction.options.getString('text') || 'This is your reminder!';

            // Get user's timezone, default to America/Chicago
            let userReminders = await getUserReminders(userId);
            let zone = 'America/Chicago';
            if (userReminders.length > 0 && userReminders[0].zone) {
                zone = userReminders[0].zone;
            }

            const newReminder = await Reminder.create({ userId, guildId, hour, minute, text, zone });

            scheduleReminder(client, newReminder);

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Reminder Set')
                .setDescription(`Your reminder is set for **${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}** (${zone}).\nMessage: "${text}"`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'remove') {
            const index = interaction.options.getInteger('index') - 1;
            let userReminders = await getUserReminders(userId);

            if (!userReminders[index]) {
                await interaction.reply({ content: 'Invalid reminder number.', embeds: [] });
                return;
            }

            if (userReminders[index]._timeout) clearTimeout(userReminders[index]._timeout);

            await Reminder.deleteOne({ _id: userReminders[index]._id });

            const embed = new EmbedBuilder()
                .setColor(0xFF6347)
                .setTitle('Reminder Removed')
                .setDescription(`Your reminder #${index + 1} has been removed.`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'list') {
            let userReminders = await getUserReminders(userId);

            if (!userReminders.length) {
                await interaction.reply({ content: 'You have no reminders set.' });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Your Reminders');

            userReminders.forEach((r, i) => {
                embed.addFields({
                    name: `#${i + 1}: ${r.hour.toString().padStart(2, '0')}:${r.minute.toString().padStart(2, '0')} (${r.zone || 'UTC'})`,
                    value: r.text,
                });
            });

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'timezone') {
            const zone = interaction.options.getString('zone');
            try {
                DateTime.now().setZone(zone);
            } catch (e) {
                await interaction.reply({ content: 'Invalid timezone. Use a valid IANA timezone string like America/New_York.', embeds: [] });
                return;
            }

            let userReminders = await getUserReminders(userId);
            for (const r of userReminders) {
                r.zone = zone;
                await r.save();
                scheduleReminder(client, r);
            }

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Timezone Set')
                .setDescription(`Your timezone has been set to **${zone}**. All your reminders will use this timezone.`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'message') {
            const index = interaction.options.getInteger('index') - 1;
            const text = interaction.options.getString('text');
            let userReminders = await getUserReminders(userId);

            if (!userReminders[index]) {
                await interaction.reply({ content: 'Invalid reminder number.', embeds: [] });
                return;
            }
            userReminders[index].text = text;
            await userReminders[index].save();

            // Reschedule this reminder in case it's running
            scheduleReminder(client, userReminders[index]);

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Reminder Message Updated')
                .setDescription(`Your reminder #${index + 1} message has been set to:\n"${text}"`);

            await interaction.reply({ embeds: [embed] });
        }

		else if (sub === 'reschedule') {
			const index = interaction.options.getInteger('index') - 1;
			const hour = interaction.options.getInteger('hour');
			const minute = interaction.options.getInteger('minute');
			let userReminders = await getUserReminders(userId);
		
			if (!userReminders[index]) {
				await interaction.reply({ content: 'Invalid reminder number.', ephemeral: true });
				return;
			}
		
			userReminders[index].hour = hour;
			userReminders[index].minute = minute;
			await userReminders[index].save();
		
			// Reschedule this reminder in case it's running
			scheduleReminder(client, userReminders[index]);
		
			const embed = new EmbedBuilder()
				.setColor(0x00BFFF)
				.setTitle('Reminder Rescheduled')
				.setDescription(`Your reminder #${index + 1} has been rescheduled to **${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}**.`);
		
			await interaction.reply({ embeds: [embed] });
		}		
    },
    async init(client) {
        await scheduleAllReminders(client);
    }
};