const SprintPingRole = require('./models/SprintPingRole');
const Sprint = require('./models/Sprint');
const Leaderboard = require('./models/Leaderboard');
const { EmbedBuilder } = require('discord.js');

module.exports = function initAgendaJobs(agenda, client) {
  // 5-Minute Warning
  agenda.define('sprint-5min-warning', async job => {
    const { sprintId, guildId, channelId } = job.attrs.data;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || !sprint.active) return;
    const channel = await client.channels.fetch(channelId);
    let content = '';
    if (guildId) {
      const pingRole = await SprintPingRole.findOne({ guildId });
      if (pingRole) content = `<@&${pingRole.roleId}>`;
    }
    await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setTitle('<a:zxpin3:1368804727395061760> 5 Minutes Left!')
          .setDescription('Only 5 minutes left in the sprint! Finish strong!')
          .setColor('#4ac4d7')
      ]
    });
  });

  // Sprint End
  agenda.define('sprint-end', async job => {
    const { sprintId, guildId, channelId } = job.attrs.data;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || !sprint.active) return;

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

    const channel = await client.channels.fetch(channelId);
    let content = '';
    if (guildId) {
      const pingRole = await SprintPingRole.findOne({ guildId });
      if (pingRole) content = `<@&${pingRole.roleId}>`;
    }
    await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setTitle('Sprint Finished! <a:zpopz:1366768293368827964>')
          .setDescription(`The reading sprint has ended!\n\n__**Results:**__\n${results}\n\nUse \`/sprint start\` to begin another.`)
          .setColor('#4ac4d7')
      ]
    });
  });
};