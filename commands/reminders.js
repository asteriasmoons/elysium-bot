const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const REMINDER_CHANNEL_ID = '1367691153297772724';
const REMINDERS_FILE = path.resolve(__dirname, '../reminders.json');

function loadReminders() {
    if (!fs.existsSync(REMINDERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
}
function saveReminders(reminders) {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

function getUserReminders(reminders, userId) {
    return reminders[userId] || [];
}

function setUserReminders(reminders, userId, userReminders) {
    reminders[userId] = userReminders;
}

function scheduleAllReminders(client, reminders, scheduled) {
    for (const userId in reminders) {
        for (const reminder of reminders[userId]) {
            scheduleReminder(client, userId, reminder, scheduled);
        }
    }
}

function scheduleReminder(client, userId, reminder, scheduled) {
    if (reminder._timeout) clearTimeout(reminder._timeout);

    // Timezone support
    const now = DateTime.now().setZone(reminder.zone || 'UTC');
    let next = now.set({ hour: reminder.hour, minute: reminder.minute, second: 0, millisecond: 0 });
    if (next <= now) next = next.plus({ days: 1 });

    const msUntil = next.diff(now).as('milliseconds');

    reminder._timeout = setTimeout(async () => {
        try {
            const channel = await client.channels.fetch(REMINDER_CHANNEL_ID);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(0x572c86)
                .setTitle('<:rayne:1291858438321602602><:boe:1291858383636529192> Reminder!')
                .setDescription(reminder.text ? reminder.text : 'This is your reminder!');

            await channel.send({
                content: `<@${userId}>`,
                embeds: [embed]
            });

            // Reschedule for next day
            scheduleReminder(client, userId, reminder, scheduled);
        } catch (err) {
            console.error('Failed to send reminder:', err);
        }
    }, msUntil);

    scheduled[userId] = scheduled[userId] || [];
    scheduled[userId].push(reminder._timeout);
}

const scheduled = {};

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
                        .setRequired(true))),
    async execute(interaction) {
        const client = interaction.client;
        const userId = interaction.user.id;
        const sub = interaction.options.getSubcommand();
        let reminders = loadReminders();

        if (sub === 'set') {
            const hour = interaction.options.getInteger('hour');
            const minute = interaction.options.getInteger('minute');
            const text = interaction.options.getString('text') || 'This is your reminder!';
            let userReminders = getUserReminders(reminders, userId);

            // Get user's timezone, default to UTC
            let zone = 'UTC';
            if (userReminders.length > 0 && userReminders[0].zone) {
                zone = userReminders[0].zone;
            }

            const newReminder = { hour, minute, text, zone };
            userReminders.push(newReminder);
            setUserReminders(reminders, userId, userReminders);
            saveReminders(reminders);

            scheduleReminder(client, userId, newReminder, scheduled);

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Reminder Set')
                .setDescription(`Your reminder is set for **${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}** (${zone}).\nMessage: "${text}"`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'remove') {
            const index = interaction.options.getInteger('index') - 1;
            let userReminders = getUserReminders(reminders, userId);

            if (!userReminders[index]) {
                await interaction.reply({ content: 'Invalid reminder number.', embeds: [] });
                return;
            }

            if (userReminders[index]._timeout) clearTimeout(userReminders[index]._timeout);

            userReminders.splice(index, 1);
            setUserReminders(reminders, userId, userReminders);
            saveReminders(reminders);

            const embed = new EmbedBuilder()
                .setColor(0xFF6347)
                .setTitle('Reminder Removed')
                .setDescription(`Your reminder #${index + 1} has been removed.`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'list') {
            let userReminders = getUserReminders(reminders, userId);

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

            let userReminders = getUserReminders(reminders, userId);
            userReminders.forEach(r => r.zone = zone);
            if (userReminders.length === 0) userReminders.push({ hour: 9, minute: 0, text: 'This is your reminder!', zone });
            setUserReminders(reminders, userId, userReminders);
            saveReminders(reminders);

            userReminders.forEach(r => scheduleReminder(client, userId, r, scheduled));

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Timezone Set')
                .setDescription(`Your timezone has been set to **${zone}**. All your reminders will use this timezone.`);

            await interaction.reply({ embeds: [embed] });
        }
        else if (sub === 'message') {
            const index = interaction.options.getInteger('index') - 1;
            const text = interaction.options.getString('text');
            let userReminders = getUserReminders(reminders, userId);

            if (!userReminders[index]) {
                await interaction.reply({ content: 'Invalid reminder number.', embeds: [] });
                return;
            }
            userReminders[index].text = text;
            setUserReminders(reminders, userId, userReminders);
            saveReminders(reminders);

            // Reschedule this reminder in case it's running
            scheduleReminder(client, userId, userReminders[index], scheduled);

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Reminder Message Updated')
                .setDescription(`Your reminder #${index + 1} message has been set to:\n"${text}"`);

            await interaction.reply({ embeds: [embed] });
        }
    },
    async init(client) {
        const reminders = loadReminders();
        scheduleAllReminders(client, reminders, scheduled);
    }
};