const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const tbrPath = './tbr.json';

function getTBRData() {
  if (!fs.existsSync(tbrPath)) return {};
  return JSON.parse(fs.readFileSync(tbrPath, 'utf8'));
}

function saveTBRData(data) {
  fs.writeFileSync(tbrPath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tbr')
    .setDescription('Manage your To Be Read (TBR) list')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a book to your TBR list')
        .addStringOption(opt =>
          opt.setName('book')
            .setDescription('The book to add')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a book from your TBR list')
        .addStringOption(opt =>
          opt.setName('book')
            .setDescription('The book to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show your TBR list')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const tbrData = getTBRData();

    // /tbr add
    if (interaction.options.getSubcommand() === 'add') {
      const book = interaction.options.getString('book').trim();
      if (!tbrData[userId]) tbrData[userId] = [];
      if (tbrData[userId].includes(book)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Already on TBR')
              .setDescription(`"${book}" is already on your TBR list!`)
              .setColor('#f1c40f')
          ],
        });
      }
      tbrData[userId].push(book);
      saveTBRData(tbrData);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Book Added!')
            .setDescription(`Added "${book}" to your TBR list.`)
            .setColor('#4ac4d7')
        ],
      });
    }

    // /tbr remove
    if (interaction.options.getSubcommand() === 'remove') {
      const book = interaction.options.getString('book').trim();
      if (!tbrData[userId] || !tbrData[userId].includes(book)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Book Not Found')
              .setDescription(`"${book}" is not on your TBR list.`)
              .setColor('#e74c3c')
          ],
        });
      }
      tbrData[userId] = tbrData[userId].filter(b => b !== book);
      saveTBRData(tbrData);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Book Removed')
            .setDescription(`Removed "${book}" from your TBR list.`)
            .setColor('#4ac4d7')
        ],
      });
    }

    // /tbr list
    if (interaction.options.getSubcommand() === 'list') {
      const list = tbrData[userId] || [];
      if (list.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('TBR List')
              .setDescription('Your TBR list is empty! Add books with `/tbr add`.')
              .setColor('#4ac4d7')
          ],
        });
      }
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s TBR List`)
            .setDescription(list.map((b, i) => `${i + 1}. ${b}`).join('\n'))
            .setColor('#4ac4d7')
        ],
      });
    }
  }
};