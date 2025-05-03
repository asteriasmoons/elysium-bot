const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const booksPath = path.join(__dirname, '../books.json');

// Load all books for all servers
function loadAllBooks() {
    if (!fs.existsSync(booksPath)) return {};
    return JSON.parse(fs.readFileSync(booksPath));
}

// Save all books for all servers
function saveAllBooks(allBooks) {
    fs.writeFileSync(booksPath, JSON.stringify(allBooks, null, 2));
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
        const guildId = interaction.guild.id;
        const title = interaction.options.getString('title').trim();
        const author = interaction.options.getString('author').trim();
        const goodreads = interaction.options.getString('goodreads')?.trim() || '';

        // Load all books
        let allBooks = loadAllBooks();

        // Get this guild's book list (initialize if doesn't exist)
        let books = allBooks[guildId] || [];

        // Check for duplicates
        if (books.some(b => 
            b.title.toLowerCase() === title.toLowerCase() &&
            b.author.toLowerCase() === author.toLowerCase()
        )) {
            await interaction.reply({ content: `That book is already in the list!`, ephemeral: true });
            return;
        }

        // Add the new book
        books.push({ title, author, goodreads });

        // Save back to allBooks and write to file
        allBooks[guildId] = books;
        saveAllBooks(allBooks);

        await interaction.reply({ content: `Book **${title}** by **${author}** added to the list!`, ephemeral: false });
    }
};