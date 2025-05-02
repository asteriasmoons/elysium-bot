const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const progressPath = path.join(__dirname, 'progress.json');

function loadProgress() {
  if (!fs.existsSync(progressPath)) fs.writeFileSync(progressPath, '[]');
  return JSON.parse(fs.readFileSync(progressPath));
}
function saveProgress(data) {
  fs.writeFileSync(progressPath, JSON.stringify(data, null, 2));
}

function normalize(str) {
  return str.trim().toLowerCase();
}

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function getDatesSetForUser(entries) {
  // Returns a Set of 'YYYY-MM-DD' strings for a user
  return new Set(
    entries.map(e => new Date(e.timestamp).toISOString().split('T')[0])
  );
}

function calculateStreak(datesSet) {
  // datesSet: Set of 'YYYY-MM-DD' strings
  let streak = 0;
  let date = new Date();
  while (true) {
    const dateStr = date.toISOString().split('T')[0];
    if (datesSet.has(dateStr)) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Helper for formatting a single progress entry
function formatEntry(e, i) {
  return `**${e.book}**\n${e.progress}${e.note ? `\n*Note:* ${e.note}` : ''}\n*${new Date(e.timestamp).toLocaleString()}*`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Log your reading progress, check your streak, or view history')
    .addSubcommand(sub =>
      sub.setName('log')
        .setDescription('Log your progress in a book')
        .addStringOption(opt => opt.setName('book').setDescription('Book title').setRequired(true))
        .addStringOption(opt => opt.setName('progress').setDescription('Current page/chapter').setRequired(true))
        .addStringOption(opt => opt.setName('note').setDescription('Optional note').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('streak')
        .setDescription('Check your reading streak')
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('See recent reading progress entries')
        .addUserOption(opt => opt.setName('user').setDescription('Whose history to view (leave blank for yourself)'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let progressData = loadProgress();

    if (sub === 'log') {
      const book = interaction.options.getString('book');
      const prog = interaction.options.getString('progress');
      const note = interaction.options.getString('note') || '';
      const entry = {
        userId: interaction.user.id,
        username: interaction.user.username,
        book: book.trim(),
        progress: prog.trim(),
        note: note.trim(),
        timestamp: Date.now()
      };
      progressData.push(entry);
      saveProgress(progressData);

      return interaction.reply({
        content: `<a:noyes1:1339800615622152237> Progress logged for **${book}**: ${prog}${note ? `\n_Note: ${note}_` : ''}`,
        ephemeral: false
      });
    }

    if (sub === 'streak') {
      const userEntries = progressData.filter(e => e.userId === interaction.user.id);
      if (userEntries.length === 0) {
        return interaction.reply({ content: "You haven't logged any progress yet. Use `/progress log` to start your streak!", ephemeral: false });
      }
      const datesSet = getDatesSetForUser(userEntries);
      const streak = calculateStreak(datesSet);

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Reading Streak`)
        .setDescription(
          streak > 0
            ? `<:lbolt2:1307190732863311902> You have a **${streak}-day reading streak!**\nKeep it up!`
            : `No streak yet. Log your progress to start one!`
        )
        .setColor(streak > 0 ? 0x6040bf : 0x86842c);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // === HISTORY WITH PAGINATION ===
    if (sub === 'history') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userEntries = progressData
        .filter(e => e.userId === targetUser.id)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (userEntries.length === 0) {
        return interaction.reply({
          content: `${targetUser.id === interaction.user.id ? "You haven't" : `${targetUser.username} hasn't`} logged any progress yet.`,
          ephemeral: false
        });
      }

      const pageSize = 3;
      let page = 0;

      // Helper to build embed for a specific page
      function buildEmbed(page) {
        const entries = userEntries.slice(page * pageSize, (page + 1) * pageSize);
        return new EmbedBuilder()
          .setTitle(`${targetUser.username}'s Recent Reading Progress`)
          .setColor(0x6040bf)
          .setDescription(entries.map(formatEntry).join('\n\n'))
          .setFooter({ text: `Page ${page + 1} of ${Math.ceil(userEntries.length / pageSize)} (${userEntries.length} entries)` });
      }

      // Helper to build action row with buttons
      function buildRow(page) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`history_prev_${interaction.id}_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`history_next_${interaction.id}_${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled((page + 1) * pageSize >= userEntries.length)
        );
      }

      // Initial reply
      await interaction.reply({
        embeds: [buildEmbed(page)],
        components: [buildRow(page)],
        ephemeral: false
      });

      // Create a collector for button interactions
      const msg = await interaction.fetchReply();
      const filter = btnInt =>
        btnInt.user.id === interaction.user.id &&
        btnInt.message.id === msg.id &&
        (btnInt.customId.startsWith(`history_prev_${interaction.id}`) || btnInt.customId.startsWith(`history_next_${interaction.id}`));

      const collector = msg.createMessageComponentCollector({ filter, time: 180 * 1000 });

      collector.on('collect', async btnInt => {
        await btnInt.deferUpdate();
        if (btnInt.customId.startsWith('history_prev')) {
          page = Math.max(page - 1, 0);
        } else if (btnInt.customId.startsWith('history_next')) {
          page = Math.min(page + 1, Math.floor((userEntries.length - 1) / pageSize));
        }
        await interaction.editReply({
          embeds: [buildEmbed(page)],
          components: [buildRow(page)]
        });
      });

      collector.on('end', async () => {
        // Disable buttons after timeout
        try {
          await interaction.editReply({
            components: [buildRow(page).setComponents(
              ...buildRow(page).components.map(btn => btn.setDisabled(true))
            )]
          });
        } catch (e) { }
      });

      return;
    }
  }
};