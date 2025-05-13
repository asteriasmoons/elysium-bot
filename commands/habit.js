const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DateTime } = require('luxon');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

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
    ),

  async execute(interaction, agenda) { // Accept agenda as 2nd argument if needed
    const subcommand = interaction.options.getSubcommand();
	const userId = interaction.user.id;
    // === /habit add ===
    if (subcommand === 'add') {
      const embed = new EmbedBuilder()
        .setTitle('<:pcht1:1371879916383240263> Add a Habit Reminder <:pcht1:1371879916383240263>')
        .setDescription(`Hey ${interaction.user.toString()} habits are great ways to build consistency in your life. Im super proud of you for wanting to build some routine in your life. Choose your habit frequency to get started:`)
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

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false
      });
    }

    // === /habit list ===
    else if (subcommand === 'list') {
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
          habits.map((h, i) =>
            `**${i + 1}. ${h.name}**\n${h.description || '_No description_'}\nFrequency: \`${h.frequency}\` at \`${h.hour}:${h.minute.toString().padStart(2, '0')}\``
          ).join('\n\n')
        );

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
    }

    // === /habit remove ===
    else if (subcommand === 'remove') {
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

      // OPTIONAL: Cancel Agenda job if you're using Agenda
      	if (agenda) {
      	await agenda.cancel({ 'data.habitId': habit._id.toString() });
      }

      return interaction.reply({
        content: `Habit "${habit.name}" has been removed.`,
        ephemeral: false
      });
    }
  }
};