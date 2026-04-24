// handlers/habitButtonHandler.js

const { EmbedBuilder } = require("discord.js");
const HabitLog = require("../models/HabitLog");
const User = require("../models/User");
const { DateTime } = require("luxon");

module.exports = async function handleHabitButtons(interaction) {
  if (
    !interaction.isButton() ||
    !interaction.customId?.startsWith("habit_dm_")
  ) {
    return false;
  }

  // Example customId: habit_dm_<habitId>_<date>_<action>
  const [, , habitId, sentDate, action] = interaction.customId.split("_");

  const userZone = "America/Chicago"; // Later you can make this dynamic
  const today = DateTime.now().setZone(userZone).toISODate();

  // === LOCKOUT CHECK ===
  if (sentDate !== today) {
    const embed = new EmbedBuilder()
      .setDescription("⏳ You cannot mark off a habit from a previous day!")
      .setColor(0x663399);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    return true;
  }

  let embed;
  let xpToAdd = 0;

  // === ACTION HANDLING ===
  if (action === "yes") {
    embed = new EmbedBuilder().setDescription(
      "Marked as done for today! Good job!",
    );
    xpToAdd = 10;
  } else if (action === "nottoday") {
    embed = new EmbedBuilder().setDescription(
      "Marked for not today. That's okay. Try again tomorrow!",
    );
    xpToAdd = 2;
  } else if (action === "skip") {
    embed = new EmbedBuilder().setDescription(
      "Marked as skipped today. That's perfectly fine. You can always try again tomorrow.",
    );
    xpToAdd = 0;
  } else {
    await interaction.reply({
      content: "Unknown action.",
      ephemeral: true,
    });
    return true;
  }

  // === SAVE LOG ===
  try {
    await HabitLog.create({
      userId: interaction.user.id,
      habitId: habitId,
      action: action,
      timestamp: new Date(),
      xp: xpToAdd,
    });
  } catch (error) {
    console.error("Failed to save HabitLog:", error);
    await interaction.reply({
      content: "Failed to log your habit. Please try again.",
      ephemeral: true,
    });
    return true;
  }

  // === APPLY XP ===
  if (xpToAdd !== 0) {
    await User.updateOne(
      { discordId: interaction.user.id },
      { $inc: { xp: xpToAdd } },
      { upsert: true },
    );
  }

  embed.setFooter({ text: `+${xpToAdd} XP` });

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });

  return true;
};
