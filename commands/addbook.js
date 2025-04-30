const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your JSON file for books
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
            option.setName('name')
                .setDescription('The name of the book')
                .setRequired(true)
        ),
    async execute(interaction) {
        const bookName = interaction.options.getString('name').trim();
        let books = loadBooks();

        if (books.includes(bookName)) {
            await interaction.reply({ content: `That book is already in the list!`, ephemeral: true });
            return;
        }

        books.push(bookName);
        saveBooks(books);

        await interaction.reply({ content: `Book **${bookName}** added to the list!`, ephemeral: false });
    }
};