const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Remove the sprintState declaration here if it's in index.js.
// If you want to share sprintState between files, you can use module.exports/imports.
// For now, let's assume all logic is in index.js, or you can move this object to sprint.js for testing.

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sprint')
    .setDescription('Reading sprint commands')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new sprint')
        .addStringOption(opt =>
          opt.setName('duration')
            .setDescription('Duration (e.g., 30m or 1h)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('Join the current sprint')
        .addIntegerOption(opt =>
          opt.setName('starting_pages')
            .setDescription('Your starting page number')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('timeleft')
        .setDescription('See how much time is left in the sprint')
    ),

  async execute(interaction) {
    // Make sure sprintState is accessible here.
    // If sprintState is in index.js, you might need to import it.
    // For now, let's assume you put it at the top of this file for simplicity:
    // (If you want to share between files, let me know and I'll show you how!)

    if (!global.sprintState) {
      global.sprintState = {
        active: false,
        endTime: null,
        participants: {},
        duration: 0,
        timeout: null,
      };
    }
    const sprintState = global.sprintState;

    // /sprint start
    if (interaction.options.getSubcommand() === 'start') {
      if (sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Already Running')
              .setDescription('A sprint is already active! Use `/sprint join` to participate.')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }

      const durationInput = interaction.options.getString('duration');
      let durationMinutes = 0;
      if (/^\d+\s*m(in)?$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput);
      } else if (/^\d+\s*h(ours?)?$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput) * 60;
      } else if (/^\d+$/.test(durationInput)) {
        durationMinutes = parseInt(durationInput);
      } else {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Invalid Duration')
              .setDescription('Please provide a valid duration (e.g., `30m` or `1h`).')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }

      if (durationMinutes < 5 || durationMinutes > 120) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Invalid Duration')
              .setDescription('Sprint duration must be between 5 and 120 minutes.')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }

      sprintState.active = true;
      sprintState.duration = durationMinutes;
      sprintState.endTime = Date.now() + durationMinutes * 60 * 1000;
      sprintState.participants = {};

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Started! 🏁')
            .setDescription(`A reading sprint has started for **${durationMinutes}** minutes!\nUse \`/sprint join\` to join in!`)
            .setColor('Green')
        ]
      });
      return;
    }

    // /sprint join
    if (interaction.options.getSubcommand() === 'join') {
      if (!sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint to join. Start one with `/sprint start`!')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }
      const userId = interaction.user.id;
      const startingPages = interaction.options.getInteger('starting_pages');

      if (sprintState.participants[userId]) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Already Joined')
              .setDescription('You have already joined this sprint!')
              .setColor('Yellow')
          ],
          ephemeral: true,
        });
      }

      sprintState.participants[userId] = {
        username: interaction.user.username,
        startingPages,
        endingPages: null,
      };

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Joined Sprint! 📚')
            .setDescription(`You joined the sprint at page **${startingPages}**!`)
            .setColor('Blue')
        ],
        ephemeral: true,
      });
    }

    // /sprint timeleft
    if (interaction.options.getSubcommand() === 'timeleft') {
      if (!sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint running.')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }

      const msLeft = sprintState.endTime - Date.now();
      if (msLeft <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Ended')
              .setDescription('The sprint has just ended!')
              .setColor('Red')
          ],
          ephemeral: true,
        });
      }

      const totalSeconds = Math.floor(msLeft / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Time Left')
            .setDescription(`⏳ **${minutes}** minutes **${seconds}** seconds left!`)
            .setColor('Blue')
        ],
        ephemeral: true,
      });
    }
  },
};