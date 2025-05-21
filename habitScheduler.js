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

  let next;

  if (habit.frequency === 'daily') {
    next = now.set({
      hour: habit.hour,
      minute: habit.minute,
      second: 0,
      millisecond: 0
    });
    if (next <= now) {
      next = next.plus({ days: 1 });
    }
  } else if (habit.frequency === 'weekly') {
    // Find next occurrence of the specified dayOfWeek
    const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const targetDay = daysOfWeek.indexOf(habit.dayOfWeek);
    if (targetDay === -1) {
      console.error(`[HabitScheduler] Invalid dayOfWeek: ${habit.dayOfWeek}`);
      return;
    }
    // Luxon: .weekday (1 = Monday, 7 = Sunday) so we map accordingly
    // We'll use JavaScript's 0 (Sunday) - 6 (Saturday) for easier math
    const nowJS = now.set({ hour: habit.hour, minute: habit.minute, second: 0, millisecond: 0 });
    const currentDay = now.weekday % 7; // Sunday (7 % 7 = 0), Monday (1 % 7 = 1), etc.
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    // If today is the target day but time has passed, schedule for next week
    if (daysToAdd === 0 && nowJS <= now) {
      daysToAdd = 7;
    }
    next = nowJS.plus({ days: daysToAdd });
  } else {
    console.error(`[HabitScheduler] Invalid frequency: ${habit.frequency}`);
    return;
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

      const userId = user.id;
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`<:pcht1:1371879916383240263> Habit Reminder: ${latestHabit.name}`)
            .setDescription(`Hey <@${userId}>, this is your habit reminder! Don’t forget to click one of the three buttons below!\n\n**${latestHabit.description || 'No description provided.'}**`)
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