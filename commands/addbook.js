const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const booksPath = path.join(__dirname, '../books.json');

function loadBooks() {
    if (!fs.existsSync(booksPath)) return [];
    return JSON.parse(fs.readFileSync(booksPath));
}
function saveBooks(books) {
    fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbook')
        .setDescription('Add a book to the bot\'s book list!')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the book')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('author')
                .setDescription('The author of the book')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('goodreads')
                .setDescription('A Goodreads link for the book')
                .setRequired(false)
        ),
    async execute(interaction) {
        const title = interaction.options.getString('title').trim();
        const author = interaction.options.getString('author').trim();
        const goodreads = interaction.options.getString('goodreads')?.trim() || '';

        let books = loadBooks();

        if (books.some(b => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase())) {
            await interaction.reply({ content: `That book is already in the list!`, ephemeral: true });
            return;
        }

        books.push({ title, author, goodreads });
        saveBooks(books);

        await interaction.reply({ content: `Book **${title}** by **${author}** added to the list!`, ephemeral: false });
    }
};