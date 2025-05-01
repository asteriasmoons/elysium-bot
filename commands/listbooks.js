const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const booksPath = path.join(__dirname, '../books.json');

function loadBooks() {
    if (!fs.existsSync(booksPath)) return [];
    return JSON.parse(fs.readFileSync(booksPath));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listbooks')
        .setDescription('List all books added to the bot!'),
    async execute(interaction) {
        const books = loadBooks();

        if (books.length === 0) {
            await interaction.reply('No books have been added yet!');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Books in the Bot')
            .setColor('#572194')
            .setDescription(
                books.map((b, i) =>
                    `${i + 1}. **${b.title}** by *${b.author}*` +
                    (b.goodreads ? ` [Goodreads](${b.goodreads})` : '')
                ).join('\n')
            );

        await interaction.reply({ embeds: [embed] });
    }
};