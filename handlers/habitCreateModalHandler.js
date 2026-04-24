// handlers/habitCreateModalHandler.js

const Habit = require("../models/Habit");
const { EmbedBuilder } = require("discord.js");
const { scheduleHabitReminder } = require("../habitScheduler");

module.exports = async function handleHabitCreateModal(interaction, client) {
  if (!interaction.isModalSubmit()) return false;

  if (!interaction.customId.startsWith("habit_modal_create_")) {
    return false;
  }

  const frequency = interaction.customId.split("_").pop(); // daily or weekly
  const userId = interaction.user.id;

  const name = interaction.fields.getTextInputValue("habit_name");
  const description = interaction.fields.getTextInputValue("habit_description");

  const hour = parseInt(interaction.fields.getTextInputValue("habit_hour"), 10);

  const minute = parseInt(
    interaction.fields.getTextInputValue("habit_minute"),
    10,
  );

  let dayOfWeek = null;

  if (frequency === "weekly") {
    dayOfWeek = interaction.fields.getTextInputValue("habit_day").trim();
  }

  // === VALIDATION ===
  const validDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (frequency === "weekly" && !validDays.includes(dayOfWeek)) {
    await interaction.reply({
      content: 'Invalid day of week! Please enter a valid day, e.g., "Monday".',
      ephemeral: true,
    });
    return true;
  }

  // === CREATE HABIT ===
  const habitId = `${userId}-${Date.now()}`;

  let habit;

  try {
    habit = await Habit.create({
      _id: habitId,
      userId,
      name,
      description,
      frequency,
      hour,
      minute,
      ...(frequency === "weekly" && { dayOfWeek }),
    });

    scheduleHabitReminder(client, habit);

    console.log("Created habit:", habit);
  } catch (error) {
    console.error("Failed to create habit:", error);

    await interaction.reply({
      content: "Failed to create habit. Please try again.",
      ephemeral: false,
    });

    return true;
  }

  const embed = new EmbedBuilder()
    .setTitle("Habit Created!")
    .setDescription(
      `Habit "**${name}**" created! You'll get **${frequency}** reminders at **${hour}:${minute
        .toString()
        .padStart(2, "0")}**${
        frequency === "weekly" ? ` every **${dayOfWeek}**` : ""
      }.`,
    )
    .setColor(0x663399);

  await interaction.reply({
    embeds: [embed],
    ephemeral: false,
  });

  return true;
};
