const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { DateTime } = require("luxon");
const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const {
  scheduleHabitReminder,
  cancelHabitReminder,
} = require("../habitScheduler");
const User = require("../models/User");

// Helper: converts Luxon's weekday (1=Monday...7=Sunday) to weekday string
const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function calculateStats(habit, logs) {
  const dateActions = {};
  logs.forEach((log) => {
    const date = DateTime.fromJSDate(log.timestamp).toISODate();
    dateActions[date] = log.action; // latest wins
  });

  const startDate = DateTime.fromJSDate(habit.createdAt).startOf("day");
  const today = DateTime.now().startOf("day");

  let allDates = [];

  if (habit.frequency === "daily") {
    const days = Math.floor(today.diff(startDate, "days").days) + 1;
    for (let i = 0; i < days; i++) {
      allDates.push(startDate.plus({ days: i }).toISODate());
    }
  } else if (habit.frequency === "weekly" && habit.dayOfWeek) {
    // Only consider the scheduled weekday
    let current = startDate;
    const targetIndex = daysOfWeek.indexOf(habit.dayOfWeek);
    // Move to first occurrence of the scheduled day
    while (current.weekday % 7 !== targetIndex) {
      current = current.plus({ days: 1 });
    }
    while (current <= today) {
      allDates.push(current.toISODate());
      current = current.plus({ days: 7 });
    }
  }

  const totalCompletions = Object.values(dateActions).filter(
    (a) => a === "yes"
  ).length;
  const todayISO = today.toISODate();
  const missedDays = allDates.filter(
    (date) => date < todayISO && !dateActions[date]
  ).length;

  // Current streak: count back from today until first non-'yes'
  let currentStreak = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const action = dateActions[allDates[i]];
    if (action === "yes") {
      currentStreak++;
    } else {
      break;
    }
  }

  return { totalCompletions, currentStreak, missedDays };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("habit")
    .setDescription("Manage your self-care habits")
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add a new habit reminder")
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List your scheduled habits")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a scheduled habit")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The name of the habit to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("View statistics for a habit")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The name of the habit")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("points")
        .setDescription("See how much XP you have earned from habits.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("reschedule")
        .setDescription("Change the time or frequency of a scheduled habit")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The name of the habit to reschedule")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("hour")
            .setDescription("New hour (0-23)")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("minute")
            .setDescription("New minute (0-59)")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("frequency")
            .setDescription("New frequency (daily/weekly)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("dayofweek")
            .setDescription("New day of week (e.g., Monday)")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // === /habit add ===
    if (subcommand === "add") {
      const embed = new EmbedBuilder()
        .setTitle(
          "<:pcht1:1371879916383240263> Add a Habit Reminder <:pcht1:1371879916383240263>"
        )
        .setDescription(
          `Hey ${interaction.user.toString()} habits are great ways to build consistency in your life. I'm super proud of you for wanting to build some routine in your life. Choose your habit frequency to get started:`
        )
        .setColor(0x663399);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("habit_frequency_daily")
          .setLabel("Daily")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("habit_frequency_weekly")
          .setLabel("Weekly")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false,
      });
    }

    // ==== /habit list ====
    if (subcommand === "list") {
      const habits = await Habit.find({ userId: interaction.user.id });
      if (!habits.length) {
        return interaction.reply({
          content: "You have no scheduled habits.",
          ephemeral: false,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("<:pcht2:1391606107885277275> Scheduled Habits")
        .setColor(0x663399)
        .setDescription(
          habits
            .map(
              (h) =>
                `**${h.name}**\n${
                  h.description || "_No description_"
                }\n**Frequency:** ${h.frequency}` +
                (h.frequency === "weekly" && h.dayOfWeek
                  ? ` on ${h.dayOfWeek}`
                  : "") +
                ` at ${h.hour}:${h.minute.toString().padStart(2, "0")}`
            )
            .join("\n\n")
        );

      return interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });
    }

    // === /habit remove ===
    if (subcommand === "remove") {
      const name = interaction.options.getString("name").trim();

      // Find and delete the habit by name (case insensitive)
      const habit = await Habit.findOneAndDelete({
        userId: interaction.user.id,
        name: new RegExp(`^${name}$`, "i"),
      });

      if (!habit) {
        return interaction.reply({
          content: `No habit found called "${name}".`,
          ephemeral: false,
        });
      }

      // Cancel the scheduled reminder using your new scheduler!
      cancelHabitReminder(habit._id.toString());

      return interaction.reply({
        content: `Habit "${habit.name}" has been removed and its reminder canceled.`,
        ephemeral: false,
      });
    }

    // === /habit stats ===
    if (subcommand === "stats") {
      const name = interaction.options.getString("name").trim();
      const habit = await Habit.findOne({
        userId: userId,
        name: new RegExp(`^${name}$`, "i"),
      });

      if (!habit) {
        return interaction.reply({
          content: `No habit found called "${name}".`,
          ephemeral: false,
        });
      }

      // Fetch all logs for this habit (any action)
      const logs = await HabitLog.find({
        userId: userId,
        habitId: habit._id,
      });

      // Calculate statistics
      const { totalCompletions, currentStreak, missedDays } = calculateStats(
        habit,
        logs
      );

      // Format and send the embed
      const embed = new EmbedBuilder()
        .setTitle(`Habit Statistics ${habit.name}`)
        .setColor(0x663399)
        .setDescription(
          `**Description:** ${habit.description || "_No description_"}\n` +
            `**Frequency:** \`${habit.frequency}\`` +
            (habit.frequency === "weekly" && habit.dayOfWeek
              ? ` on \`${habit.dayOfWeek}\``
              : "") +
            ` at \`${habit.hour}:${habit.minute
              .toString()
              .padStart(2, "0")}\`\n\n` +
            `**Total completions:** \`${totalCompletions}\`\n` +
            `**Current streak:** \`${currentStreak} ${
              habit.frequency === "weekly" ? "weeks" : "days"
            }\`\n` +
            `**Missed ${
              habit.frequency === "weekly" ? "weeks" : "days"
            }:** \`${missedDays}\``
        );

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // === /habit points ===
    if (subcommand === "points") {
      // Fetch the user from the database
      const user = await User.findOne({ discordId: userId });
      let xp = 0;
      if (user && user.xp) xp = user.xp;

      const embed = new EmbedBuilder()
        .setTitle("Your Habit XP")
        .setDescription(`You have **${xp} XP** from completing habits!`)
        .setColor(0x663399)
        .setFooter({ text: "Keep up the good work!" });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // === /habit reschedule ===
    if (subcommand === "reschedule") {
      const name = interaction.options.getString("name").trim();
      const newHour = interaction.options.getInteger("hour");
      const newMinute = interaction.options.getInteger("minute");
      const newFrequency = interaction.options.getString("frequency"); // optional
      const newDayOfWeek = interaction.options.getString("dayofweek"); // optional

      // Find the habit (case-insensitive)
      const habit = await Habit.findOne({
        userId: userId,
        name: new RegExp(`^${name}$`, "i"),
      });

      if (!habit) {
        return interaction.reply({
          content: `No habit found called "${name}".`,
          ephemeral: false,
        });
      }

      habit.hour = newHour;
      habit.minute = newMinute;
      if (newFrequency) habit.frequency = newFrequency.toLowerCase();
      if (newDayOfWeek) habit.dayOfWeek = newDayOfWeek;
      await habit.save();

      // Reschedule with new time/frequency
      scheduleHabitReminder(interaction.client, habit);

      return interaction.reply({
        content: `Habit "${habit.name}" rescheduled to ${String(
          newHour
        ).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}${
          newFrequency ? ` (${newFrequency})` : ""
        }${newDayOfWeek ? ` on ${newDayOfWeek}` : ""}.`,
        ephemeral: false,
      });
    }
  },
};
