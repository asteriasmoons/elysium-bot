const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const leaderboardPath = './leaderboard.json';
const configPath = './sprint-config.json';

// --- Helper function for designated sprint channel ---
function getSprintChannel(interaction) {
  if (!interaction.guild) return interaction.channel;
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  const channelId = config[interaction.guild.id];
  if (channelId) {
    return interaction.guild.channels.cache.get(channelId) || interaction.channel;
  }
  return interaction.channel;
}

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
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('Manually end the current sprint and show results')
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
            const sprintChannel = getSprintChannel(interaction); // <-- NEW
            await sprintChannel.send({
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
          const sprintChannel = getSprintChannel(interaction); // <-- NEW
          await sprintChannel.send({
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
      });
    }

    // /sprint end
    if (interaction.options.getSubcommand() === 'end') {
      // Permission check: only allow users with Manage Guild
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Permission')
              .setDescription('Only server admins can end the sprint early.')
              .setColor('#4ac4d7')
          ],
        });
      }

      if (!sprintState.active) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint to end.')
              .setColor('#4ac4d7')
          ],
        });
      }

      // Clear any running timeouts
      if (sprintState.timeout) {
        clearTimeout(sprintState.timeout);
        sprintState.timeout = null;
      }
      if (sprintState.warningTimeout) {
        clearTimeout(sprintState.warningTimeout);
        sprintState.warningTimeout = null;
      }

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

      sprintState.active = false;
      sprintState.endTime = null;
      sprintState.duration = 0;
      sprintState.participants = {};

      // Post results in designated channel
      const sprintChannel = getSprintChannel(interaction); // <-- NEW
      await sprintChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Ended Early! <a:zpopz:1366768293368827964>')
            .setDescription(`The reading sprint was ended manually!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
            .setColor('#4ac4d7')
        ]
      });
      await interaction.reply({
        content: 'Sprint results posted in the designated sprint channel!',
      });
      return;
    }
  },
};