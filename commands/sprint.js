const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Sprint = require('../models/Sprint');
const Leaderboard = require('../models/Leaderboard');
const SprintConfig = require('../models/SprintConfig');

// Helper: Get designated sprint channel (uses MongoDB now)
async function getSprintChannel(interaction) {
  if (!interaction.guild) return interaction.channel;
  const config = await SprintConfig.findOne({ guildId: interaction.guild.id });
  if (config) {
    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (channel) return channel;
  }
  return interaction.channel;
}

// Helper: Find active sprint for this guild/DM
async function findActiveSprint(interaction) {
  const query = interaction.guild
    ? { guildId: interaction.guild.id, active: true }
    : { guildId: null, channelId: interaction.channel.id, active: true };
  return await Sprint.findOne(query);
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
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('Show the sprint leaderboard')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /sprint start
    if (sub === 'start') {
      const existing = await findActiveSprint(interaction);
      if (existing) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Already Running')
              .setDescription('A sprint is already active! Use `/sprint join` to participate.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      const durationInput = interaction.options.getString('duration').trim().toLowerCase();
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
              .setColor('#4ac4d7')
          ],
          ephemeral: true
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
          ephemeral: true
        });
      }

      // Create sprint in DB
      const sprint = await Sprint.create({
        guildId: interaction.guild ? interaction.guild.id : null,
        channelId: interaction.channel.id,
        active: true,
        duration: durationMinutes,
        endTime: new Date(Date.now() + durationMinutes * 60 * 1000),
        participants: []
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Started! <a:noyes1:1339800615622152237>')
            .setDescription(`A reading sprint has started for **${durationMinutes}** minutes!\nUse \`/sprint join\` to participate!`)
            .setColor('#4ac4d7')
        ]
      });

      // Schedule warning and finish using setTimeout, manage timeouts in client.sprintTimeouts
      const warningTimeout = durationMinutes > 5
        ? setTimeout(async () => {
            try {
              // Double-check if sprint is still active
              const sprintCheck = await Sprint.findById(sprint._id);
              if (!sprintCheck || !sprintCheck.active) return;
              const sprintChannel = await getSprintChannel(interaction);
              await sprintChannel.send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('<a:zxpin3:1368804727395061760> 5 Minutes Left!')
                    .setDescription('Only 5 minutes left in the sprint! Finish strong!')
                    .setColor('#4ac4d7')
                ]
              });
            } catch (err) {}
          }, (durationMinutes - 5) * 60 * 1000)
        : null;

      const endTimeout = setTimeout(async () => {
        // Remove timeouts from the map
        const timeouts = interaction.client.sprintTimeouts.get(sprint._id.toString());
        if (timeouts) {
          if (timeouts.warningTimeout) clearTimeout(timeouts.warningTimeout);
          // No need to clear endTimeout here, it's this function!
          interaction.client.sprintTimeouts.delete(sprint._id.toString());
        }

        const sprintDoc = await Sprint.findById(sprint._id);
        if (!sprintDoc || !sprintDoc.active) return;

        sprintDoc.active = false;
        await sprintDoc.save();

        // Update leaderboard
        for (const p of sprintDoc.participants) {
          if (p.endingPages !== undefined && p.endingPages !== null) {
            const pagesRead = p.endingPages - p.startingPages;
            if (pagesRead > 0) {
              await Leaderboard.findOneAndUpdate(
                { userId: p.userId },
                { $inc: { totalPages: pagesRead } },
                { upsert: true }
              );
            }
          }
        }

        // Build results message
        let results = '';
        if (sprintDoc.participants.length === 0) {
          results = 'No one joined this sprint!';
        } else {
          results = sprintDoc.participants.map(p => {
            if (p.endingPages !== undefined && p.endingPages !== null) {
              const pagesRead = p.endingPages - p.startingPages;
              return `<@${p.userId}>: ${p.startingPages} → ${p.endingPages} (**${pagesRead} pages**)`;
            } else {
              return `<@${p.userId}>: started at ${p.startingPages}, did not submit ending page.`;
            }
          }).join('\n');
        }

        try {
          const sprintChannel = await getSprintChannel(interaction);
          await sprintChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Sprint Finished! <a:zpopz:1366768293368827964>')
                .setDescription(`The reading sprint has ended!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
                .setColor('#4ac4d7')
            ]
          });
        } catch (err) {}
      }, durationMinutes * 60 * 1000);

      // Store timeouts in client map
      interaction.client.sprintTimeouts.set(sprint._id.toString(), { warningTimeout, endTimeout });

      return;
    }

    // /sprint join
    if (sub === 'join') {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint to join. Start one with `/sprint start`!')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      const userId = interaction.user.id;
      const startingPages = interaction.options.getInteger('starting_pages');

      if (sprint.participants.some(p => p.userId === userId)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Already Joined')
              .setDescription('You have already joined this sprint!')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      sprint.participants.push({
        userId,
        username: interaction.user.username,
        startingPages,
        endingPages: null
      });
      await sprint.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Joined Sprint! <:pcbuk:1368854535220494367>')
            .setDescription(`You joined the sprint at page **${startingPages}**!`)
            .setColor('#4ac4d7')
        ],
      });
    }

    // /sprint finish
    if (sub === 'finish') {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint running.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }
      const userId = interaction.user.id;
      const endingPages = interaction.options.getInteger('ending_pages');
      const participant = sprint.participants.find(p => p.userId === userId);

      if (!participant) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Not Joined')
              .setDescription('You have not joined this sprint yet. Use `/sprint join` first!')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      participant.endingPages = endingPages;
      await sprint.save();

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
    if (sub === 'timeleft') {
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint running.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      const msLeft = sprint.endTime - Date.now();
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
            .setTitle('<a:zxpin3:1368804727395061760> Sprint Time Left')
            .setDescription(`**${minutes}** minutes **${seconds}** seconds left!`)
            .setColor('#4ac4d7')
        ],
      });
    }

    // /sprint end
    if (sub === 'end') {
      if (interaction.guild && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Permission')
              .setDescription('Only server admins can end the sprint early.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }
      const sprint = await findActiveSprint(interaction);
      if (!sprint) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Active Sprint')
              .setDescription('There is no active sprint to end.')
              .setColor('#4ac4d7')
          ],
          ephemeral: true
        });
      }

      // Clear any timeouts for this sprint
      const timeouts = interaction.client.sprintTimeouts.get(sprint._id.toString());
      if (timeouts) {
        if (timeouts.warningTimeout) clearTimeout(timeouts.warningTimeout);
        if (timeouts.endTimeout) clearTimeout(timeouts.endTimeout);
        interaction.client.sprintTimeouts.delete(sprint._id.toString());
      }

      sprint.active = false;
      await sprint.save();

      // Update leaderboard
      for (const p of sprint.participants) {
        if (p.endingPages !== undefined && p.endingPages !== null) {
          const pagesRead = p.endingPages - p.startingPages;
          if (pagesRead > 0) {
            await Leaderboard.findOneAndUpdate(
              { userId: p.userId },
              { $inc: { totalPages: pagesRead } },
              { upsert: true }
            );
          }
        }
      }

      // Build results message
      let results = '';
      if (sprint.participants.length === 0) {
        results = 'No one joined this sprint!';
      } else {
        results = sprint.participants.map(p => {
          if (p.endingPages !== undefined && p.endingPages !== null) {
            const pagesRead = p.endingPages - p.startingPages;
            return `<@${p.userId}>: ${p.startingPages} → ${p.endingPages} (**${pagesRead} pages**)`;
          } else {
            return `<@${p.userId}>: started at ${p.startingPages}, did not submit ending page.`;
          }
        }).join('\n');
      }

      const sprintChannel = await getSprintChannel(interaction);
      await sprintChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Ended Early! <a:zpopz:1366768293368827964>')
            .setDescription(`The reading sprint was ended manually!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
            .setColor('#4ac4d7')
        ]
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder().setColor('#4ac4d7').setDescription('Sprint results posted in the designated sprint channel!')
        ],
        ephemeral: true
      });
      return;
    }

    // /sprint leaderboard
    if (sub === 'leaderboard') {
      // Get top 10 users by totalPages
      const top = await Leaderboard.find().sort({ totalPages: -1 }).limit(10);

      if (!top.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Leaderboard')
              .setDescription('No one is on the leaderboard yet! Join a sprint to get started.')
              .setColor('#4ac4d7')
          ]
        });
      }

      let desc = '';
      for (let i = 0; i < top.length; i++) {
        const entry = top[i];
        desc += `**${i + 1}.** <@${entry.userId}> — **${entry.totalPages}** pages\n`;
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('<:pcbuk:1368854535220494367> Sprint Leaderboard')
            .setDescription(desc)
            .setColor('#4ac4d7')
        ]
      });
    }
  },
};
