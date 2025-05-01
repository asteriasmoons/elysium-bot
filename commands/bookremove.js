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
        .setName('bookremove')
        .setDescription('Remove a book from the bot\'s book list!')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the book to remove')
                .setRequired(true)
        ),
    async execute(interaction) {
        const bookName = interaction.options.getString('name').trim();
        let books = loadBooks();

        const index = books.findIndex(b => b.toLowerCase() === bookName.toLowerCase());
        if (index === -1) {
            await interaction.reply({ content: `That book was not found in the list.`, ephemeral: true });
            return;
        }

        books.splice(index, 1);
        saveBooks(books);

        await interaction.reply({ content: `Book **${bookName}** has been removed from the list.`, ephemeral: false });
    }
};