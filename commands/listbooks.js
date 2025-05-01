const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const booksPath = path.join(__dirname, '../books.json');
const BOOKS_PER_PAGE = 5;

function loadBooks() {
    if (!fs.existsSync(booksPath)) return [];
    return JSON.parse(fs.readFileSync(booksPath));
}

function generateEmbed(books, page) {
    const start = page * BOOKS_PER_PAGE;
    const end = start + BOOKS_PER_PAGE;
    const booksToShow = books.slice(start, end);

    const embed = new EmbedBuilder()
        .setTitle('Books in the Bot')
        .setColor('#572194')
        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(books.length / BOOKS_PER_PAGE)}` });

    booksToShow.forEach((b, i) => {
        embed.addFields({
            name: `${start + i + 1}. ${b.title}`,
            value: 
                `**Title:** ${b.title}\n` +
                `**Author:** ${b.author}\n` +
                `**Good Reads Hyperlink:** ${b.goodreads ? `[Link](${b.goodreads})` : 'N/A'}`
        });
    });

    return embed;
}

function generateRow(page, maxPage) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('back')
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === maxPage)
    );
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

        let page = 0;
        const maxPage = Math.floor((books.length - 1) / BOOKS_PER_PAGE);

        const embed = generateEmbed(books, page);
        const row = generateRow(page, maxPage);

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // 5 minute collector
        const collector = reply.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id, 
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'next') {
                if (page < maxPage) page++;
            } else if (i.customId === 'back') {
                if (page > 0) page--;
            }

            const newEmbed = generateEmbed(books, page);
            const newRow = generateRow(page, maxPage);

            await i.update({ embeds: [newEmbed], components: [newRow] });
        });

        collector.on('end', async () => {
            // Disable buttons when interaction times out
            const disabledRow = generateRow(page, maxPage);
            disabledRow.components.forEach(btn => btn.setDisabled(true));
            await reply.edit({ components: [disabledRow] });
        });
    }
};