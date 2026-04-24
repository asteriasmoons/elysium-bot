// handlers/habitFrequencyHandler.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = async function handleHabitFrequency(interaction) {
  if (
    !interaction.isButton() ||
    !(
      interaction.customId === "habit_frequency_daily" ||
      interaction.customId === "habit_frequency_weekly"
    )
  ) {
    return false;
  }

  const frequency =
    interaction.customId === "habit_frequency_daily" ? "daily" : "weekly";

  const modal = new ModalBuilder()
    .setCustomId(`habit_modal_create_${frequency}`)
    .setTitle("Set Up Your Habit")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("habit_name")
          .setLabel("Habit Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("habit_description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("habit_hour")
          .setLabel("Hour (0-23)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("habit_minute")
          .setLabel("Minute (0-59)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      ...(frequency === "weekly"
        ? [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("habit_day")
                .setLabel("Day of the Week (e.g., Monday)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            ),
          ]
        : []),
    );

  await interaction.showModal(modal);
  return true;
};
