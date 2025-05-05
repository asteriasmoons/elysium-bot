const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TBR = require('../models/TBR');

const customEmoji = '<a:twirlystar2:1339802627810005042>';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tbr')
    .setDescription('Manage your To Be Read (TBR) list')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a book to your TBR list')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Book title')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('author')
            .setDescription('Book author')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a book from your TBR list')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Book title')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('author')
            .setDescription('Book author')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show your TBR list')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user whose TBR list you want to view (optional)')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /tbr add
    if (sub === 'add') {
      const userId = interaction.user.id;
      const title = interaction.options.getString('title').trim();
      const author = interaction.options.getString('author').trim();

      let tbr = await TBR.findOne({ userId });
      if (!tbr) tbr = new TBR({ userId, books: [] });

      const alreadyExists = tbr.books.some(
        b => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase()
      );

      if (alreadyExists) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Already on TBR')
              .setDescription(`"${title}" by ${author} is already on your TBR list!`)
              .setColor('#f1c40f')
          ],
          ephemeral: true
        });
      }

      tbr.books.push({ title, author });
      await tbr.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Book Added!')
            .setDescription(`Added "${title}" by ${author} to your TBR list.`)
            .setColor('#4ac4d7')
        ]
      });
    }

    // /tbr remove
    if (sub === 'remove') {
      const userId = interaction.user.id;
      const title = interaction.options.getString('title').trim();
      const author = interaction.options.getString('author').trim();

      let tbr = await TBR.findOne({ userId });
      if (!tbr) tbr = new TBR({ userId, books: [] });

      const bookIndex = tbr.books.findIndex(
        b => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase()
      );

      if (bookIndex === -1) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Book Not Found')
              .setDescription(`"${title}" by ${author} is not on your TBR list.`)
              .setColor('#e74c3c')
          ],
          ephemeral: true
        });
      }

      tbr.books.splice(bookIndex, 1);
      await tbr.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Book Removed')
            .setDescription(`Removed "${title}" by ${author} from your TBR list.`)
            .setColor('#4ac4d7')
        ]
      });
    }

    // /tbr list
    if (sub === 'list') {
      const user = interaction.options.getUser('user') || interaction.user;
      let tbr = await TBR.findOne({ userId: user.id });
      if (!tbr) tbr = new TBR({ userId: user.id, books: [] });

      if (tbr.books.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${user.username}'s TBR List`)
              .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
              .setDescription(
                user.id === interaction.user.id
                  ? 'Your TBR list is empty! Add books with `/tbr add`.'
                  : 'Their TBR list is empty!'
              )
              .setColor('#4ac4d7')
          ]
        });
      }

      // Display list with both title and author
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${user.username}'s TBR List`)
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setDescription(
              tbr.books.map((b, i) => `${customEmoji} ${i + 1}. **${b.title}** by *${b.author}*`).join('\n')
            )
            .setColor('#4ac4d7')
        ]
      });
    }
  }
};