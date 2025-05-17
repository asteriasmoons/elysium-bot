const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DateTime } = require('luxon');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { scheduleHabitReminder, cancelHabitReminder } = require('../habitScheduler'); // <-- NEW!

function calculateStats(habit, logs) {
  const dateActions = {};
  logs.forEach(log => {
    const date = DateTime.fromJSDate(log.timestamp).toISODate();
    dateActions[date] = log.action; // latest wins
  });

  const startDate = DateTime.fromJSDate(habit.createdAt).startOf('day');
  const today = DateTime.now().startOf('day');
  const days = Math.floor(today.diff(startDate, 'days').days) + 1;

  let allDates = [];
  for (let i = 0; i < days; i++) {
    allDates.push(startDate.plus({ days: i }).toISODate());
  }

  const totalCompletions = Object.values(dateActions).filter(a => a === 'yes').length;

  // Only count days before today as missed
  const todayISO = today.toISODate();
  const missedDays = allDates.filter(date => date < todayISO && !dateActions[date]).length;

  // Current streak: count back from today until first non-'yes'
  let currentStreak = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const action = dateActions[allDates[i]];
    if (action === 'yes') {
      currentStreak++;
    } else {
      break;
    }
  }

  return { totalCompletions, currentStreak, missedDays };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('habit')
    .setDescription('Manage your self-care habits')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a new habit reminder')
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List your scheduled habits')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a scheduled habit')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('The name of the habit to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stats') 
        .setDescription('View statistics for a habit')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('The name of the habit')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // === /habit add ===
    if (subcommand === 'add') {
      const embed = new EmbedBuilder()
        .setTitle('<:pcht1:1371879916383240263> Add a Habit Reminder <:pcht1:1371879916383240263>')
        .setDescription(`Hey ${interaction.user.toString()} habits are great ways to build consistency in your life. I'm super proud of you for wanting to build some routine in your life. Choose your habit frequency to get started:`)
        .setColor(0x663399);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('habit_frequency_daily')
          .setLabel('Daily')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('habit_frequency_weekly')
          .setLabel('Weekly')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false
      });
    }

    // ==== /habit list ====
    if (subcommand === 'list') {
      const habits = await Habit.find({ userId: interaction.user.id });
      if (!habits.length) {
        return interaction.reply({
          content: 'You have no scheduled habits.',
          ephemeral: false
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('<:pcht1:1371879916383240263> Scheduled Habits')
        .setColor(0x663399)
        .setDescription(
          habits.map((h) =>
            `**${h.name}**\n${h.description || '_No description_'}\nFrequency: \`${h.frequency}\` at \`${h.hour}:${h.minute.toString().padStart(2, '0')}\``
          ).join('\n\n')
        );

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
    }

    // === /habit remove ===
    if (subcommand === 'remove') {
      const name = interaction.options.getString('name').trim();

      // Find and delete the habit by name (case insensitive)
      const habit = await Habit.findOneAndDelete({
        userId: interaction.user.id,
        name: new RegExp(`^${name}$`, 'i')
      });

      if (!habit) {
        return interaction.reply({
          content: `No habit found called "${name}".`,
          ephemeral: false
        });
      }

      // Cancel the scheduled reminder using your new scheduler!
      cancelHabitReminder(habit._id.toString());

      return interaction.reply({
        content: `Habit "${habit.name}" has been removed and its reminder canceled.`,
        ephemeral: false
      });
    }

    // === /habit stats ===
    if (subcommand === 'stats') {
      const name = interaction.options.getString('name').trim();
      const habit = await Habit.findOne({
        userId: userId,
        name: new RegExp(`^${name}$`, 'i')
      });

      if (!habit) {
        return interaction.reply({
          content: `No habit found called "${name}".`,
          ephemeral: false
        });
      }

      // Fetch all logs for this habit (any action)
      const logs = await HabitLog.find({
        userId: userId,
        habitId: habit._id
      });

      // Calculate statistics
      const { totalCompletions, currentStreak, missedDays } = calculateStats(habit, logs);

      // Format and send the embed
      const embed = new EmbedBuilder()
        .setTitle(`Habit Statistics ${habit.name}`)
        .setColor(0x663399)
        .setDescription(
          `**Description:** ${habit.description || '_No description_'}\n` +
          `**Frequency:** \`${habit.frequency}\` at \`${habit.hour}:${habit.minute.toString().padStart(2, '0')}\`\n\n` +
          `**Total completions:** \`${totalCompletions}\`\n` +
          `**Current streak:** \`${currentStreak} days\`\n` +
          `**Missed days:** \`${missedDays}\``
        );

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};