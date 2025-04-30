const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const leaderboardPath = './leaderboard.json';

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
      sub.setName('finish')
        .setDescription('Submit your ending page for the sprint')
        .addIntegerOption(opt =>
          opt.setName('ending_pages')
            .setDescription('Your ending page number')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('timeleft')
        .setDescription('See how much time is left in the sprint')
    ),

  async execute(interaction) {
    const sprintState = interaction.client.sprintState;

    // /sprint start
    if (interaction.options.getSubcommand() === 'start') {
      if (sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Already Running')
              .setDescription('A sprint is already active! Use `/sprint join` to participate.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true,
        });
      }

      const durationInput = interaction.options.getString('duration').trim().toLowerCase();
      let durationMinutes = 0;

      // Parse duration
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
              .setColor('#4ac4d7')
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
              .setColor('#4ac4d7')
          ],
          ephemeral: true,
        });
      }

      sprintState.active = true;
      sprintState.duration = durationMinutes;
      sprintState.endTime = Date.now() + durationMinutes * 60 * 1000;
      sprintState.participants = {};

      // Clear any previous timeouts
      if (sprintState.timeout) {
        clearTimeout(sprintState.timeout);
        sprintState.timeout = null;
      }
      if (sprintState.warningTimeout) {
        clearTimeout(sprintState.warningTimeout);
        sprintState.warningTimeout = null;
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Started! <a:noyes1:1339800615622152237>')
            .setDescription(`A reading sprint has started for **${durationMinutes}** minutes!\nUse \`/sprint join\` to participate!`)
            .setColor('#4ac4d7')
        ]
      });

      // Schedule 5-minute warning if sprint is longer than 5 minutes
      if (durationMinutes > 5) {
        sprintState.warningTimeout = setTimeout(async () => {
          try {
            await interaction.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle('⏰ 5 Minutes Left!')
                  .setDescription('Only 5 minutes left in the sprint! Finish strong! 💪')
                  .setColor('#4ac4d7')
              ]
            });
          } catch (err) {
            // Ignore errors (e.g. channel deleted)
          }
        }, (durationMinutes - 5) * 60 * 1000);
      }

      // Schedule end-of-sprint message with results and leaderboard update
      sprintState.timeout = setTimeout(async () => {
        sprintState.active = false;
        sprintState.endTime = null;
        sprintState.duration = 0;
        sprintState.timeout = null;
        sprintState.warningTimeout = null;

        // --- Update leaderboard ---
        let leaderboard = {};
        if (fs.existsSync(leaderboardPath)) {
          leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
        }
        for (const [userId, p] of Object.entries(sprintState.participants)) {
          if (p.endingPages !== null && p.endingPages !== undefined) {
            const pagesRead = p.endingPages - p.startingPages;
            if (!leaderboard[userId]) leaderboard[userId] = 0;
            leaderboard[userId] += pagesRead;
          }
        }
        fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));

        // --- Build results message ---
        let results = '';
        if (Object.keys(sprintState.participants).length === 0) {
          results = 'No one joined this sprint!';
        } else {
          results = Object.entries(sprintState.participants).map(([userId, p]) => {
            if (p.endingPages !== null && p.endingPages !== undefined) {
              const pagesRead = p.endingPages - p.startingPages;
              return `<@${userId}>: ${p.startingPages} → ${p.endingPages} (**${pagesRead} pages**)`;
            } else {
              return `<@${userId}>: started at ${p.startingPages}, did not submit ending page.`;
            }
          }).join('\n');
        }

        try {
          await interaction.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Sprint Finished! <a:zpopz:1366768293368827964>')
                .setDescription(`The reading sprint has ended!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
                .setColor('#4ac4d7')
            ]
          });
        } catch (err) {
          // Ignore errors (e.g. channel deleted)
        }
        sprintState.participants = {};
      }, durationMinutes * 60 * 1000);

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
              .setColor('#4ac4d7')
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
              .setColor('#4ac4d7')
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
            .setTitle('Joined Sprint! <:boox5:1291879709873016842>')
            .setDescription(`You joined the sprint at page **${startingPages}**!`)
            .setColor('#4ac4d7')
        ],
        ephemeral: true,
      });
    }

    // /sprint finish
    if (interaction.options.getSubcommand() === 'finish') {
      if (!sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint running.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true,
        });
      }
      const userId = interaction.user.id;
      const endingPages = interaction.options.getInteger('ending_pages');

      if (!sprintState.participants[userId]) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Not Joined')
              .setDescription('You have not joined this sprint yet. Use `/sprint join` first!')
              .setColor('#4ac4d7')
          ],
          ephemeral: true,
        });
      }

      sprintState.participants[userId].endingPages = endingPages;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Finished! <a:zpopz:1366768293368827964>')
            .setDescription(`You finished the sprint at page **${endingPages}**!`)
            .setColor('#4ac4d7')
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
              .setColor('#4ac4d7')
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
              .setColor('#4ac4d7')
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
            .setColor('#4ac4d7')
        ],
        ephemeral: true,
      });
    }
  },
};