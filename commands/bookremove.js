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
        .setName('bookremove')
        .setDescription('Remove a book from the bot\'s book list!')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the book to remove')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('author')
                .setDescription('The author of the book to remove')
                .setRequired(true)
        ),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const title = interaction.options.getString('title').trim();
        const author = interaction.options.getString('author').trim();

        // Load all books
        let allBooks = loadAllBooks();

        // Get this guild's book list
        let books = allBooks[guildId] || [];

        // Find the book by title and author
        const index = books.findIndex(
            b => b.title.toLowerCase() === title.toLowerCase() &&
                 b.author.toLowerCase() === author.toLowerCase()
        );

        if (index === -1) {
            await interaction.reply({ content: `That book was not found in the list.`, ephemeral: true });
            return;
        }

        // Remove the book
        books.splice(index, 1);

        // Update the allBooks object
        allBooks[guildId] = books;

        // Optionally, remove the guild key if no books are left
        if (books.length === 0) {
            delete allBooks[guildId];
        }

        // Save the updated books file
        saveAllBooks(allBooks);

        await interaction.reply({ content: `Book **${title}** by **${author}** has been removed from the list.`, ephemeral: false });
    }
};