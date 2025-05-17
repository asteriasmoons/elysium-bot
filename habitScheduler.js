// habitScheduler.js
const { DateTime } = require('luxon');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Habit = require('./models/Habit');

const scheduledHabits = {}; // { habitId: timeout }

function scheduleAllHabits(client) {
  console.log('[HabitScheduler] Scheduling all habits from DB...');
  Habit.find({}).then(habits => {
    habits.forEach(habit => scheduleHabitReminder(client, habit));
    console.log(`[HabitScheduler] Scheduled ${habits.length} habits.`);
  }).catch(console.error);
}

function scheduleHabitReminder(client, habit) {
  if (!habit || !habit._id) return;

  // Cancel previous timeout if exists
  if (scheduledHabits[habit._id]) {
    clearTimeout(scheduledHabits[habit._id]);
    delete scheduledHabits[habit._id];
  }

  const zone = habit.timezone || 'America/Chicago';
  const now = DateTime.now().setZone(zone);

  let next = now.set({
    hour: habit.hour,
    minute: habit.minute,
    second: 0,
    millisecond: 0
  });

  // If the time has passed today, schedule for next day/week
  if (next <= now) {
    next = next.plus({ days: habit.frequency === 'daily' ? 1 : 7 });
  } else if (habit.frequency === 'weekly') {
    // For weekly, only schedule for the next week if today is past the time
    next = next.plus({ days: 7 * (next <= now ? 1 : 0) });
  }

  const msUntil = next.diff(now).as('milliseconds');
  if (msUntil < 0) {
    console.error(`[HabitScheduler] Negative msUntil for habit ${habit._id}. Skipping scheduling.`);
    return;
  }

  // Schedule the timeout
  scheduledHabits[habit._id] = setTimeout(async () => {
    // Re-fetch in case of changes
    const latestHabit = await Habit.findById(habit._id);
    if (!latestHabit) {
      delete scheduledHabits[habit._id];
      return;
    }

    try {
      const user = await client.users.fetch(latestHabit.userId);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`habit_dm_${habit._id}_yes`).setLabel('Yes').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`habit_dm_${habit._id}_nottoday`).setLabel('Not Today').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`habit_dm_${habit._id}_skip`).setLabel('Skip').setStyle(ButtonStyle.Secondary)
      );

      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🔔 Habit Reminder: ${latestHabit.name}`)
            .setDescription(latestHabit.description || 'No description provided.')
            .setColor(0x663399)
        ],
        components: [buttons]
      });

      console.log(`[HabitScheduler] Sent habit reminder to ${user.id} for "${latestHabit.name}"`);
    } catch (e) {
      console.error('[HabitScheduler] Failed to send habit reminder:', e);
    }

    // Reschedule for next time
    scheduleHabitReminder(client, latestHabit);
  }, msUntil);

  // Optionally, log scheduling for debugging
  console.log(`[HabitScheduler] Scheduled habit "${habit.name}" (${habit._id}) for user ${habit.userId} in ${Math.round(msUntil / 1000)} seconds`);
}

function cancelHabitReminder(habitId) {
  if (scheduledHabits[habitId]) {
    clearTimeout(scheduledHabits[habitId]);
    delete scheduledHabits[habitId];
    console.log(`[HabitScheduler] Canceled scheduled habit ${habitId}`);
  }
}

module.exports = {
  scheduleAllHabits,
  scheduleHabitReminder,
  cancelHabitReminder
};