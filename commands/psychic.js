const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const PsychicUsage = require("../models/PsychicUsage");

const MAX_USES = 3;
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

module.exports = {
  data: new SlashCommandBuilder()
    .setName("psychic")
    .setDescription(
      "Test your psychic powers by guessing a number between 1 and 10!"
    )
    .addIntegerOption((option) =>
      option
        .setName("guess")
        .setDescription("Your psychic guess")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = new Date();

    let usage = await PsychicUsage.findOne({ userId });

    // If no record exists yet
    if (!usage) {
      usage = await PsychicUsage.create({ userId });
    }

    // If user is in cooldown
    if (usage.cooldownUntil && usage.cooldownUntil > now) {
      const remainingMs = usage.cooldownUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Cooldown Active")
            .setDescription(
              `You've used your psychic powers too much! Try again in **${remainingMinutes} minute(s)**.`
            )
            .setColor(0x6b4dff),
        ],
        ephemeral: false,
      });
    }

    // Run the guessing logic
    const userGuess = interaction.options.getInteger("guess");
    const actualNumber = Math.floor(Math.random() * 10) + 1;
    const isCorrect = userGuess === actualNumber;

    const embed = new EmbedBuilder()
      .setTitle("Psychic Guess Result")
      .setDescription(
        isCorrect
          ? `✨ You guessed **${userGuess}** and the number was **${actualNumber}** — you were **correct!** Psychic powers confirmed!`
          : `You guessed **${userGuess}**, but the number was **${actualNumber}**. Not quite, but keep tuning in!`
      )
      .setColor(0x6b4dff);

    await interaction.reply({ embeds: [embed] });

    // Update usage count
    usage.count += 1;

    if (usage.count >= MAX_USES) {
      usage.cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      usage.count = 0;
    }

    await usage.save();
  },
};
