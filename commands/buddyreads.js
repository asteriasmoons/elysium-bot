const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const buddyReadsPath = path.join(__dirname, '../buddyreads.json');

function loadBuddyReads() {
    if (!fs.existsSync(buddyReadsPath)) return [];
    return JSON.parse(fs.readFileSync(buddyReadsPath));
}
function saveBuddyReads(data) {
    fs.writeFileSync(buddyReadsPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buddyread')
        .setDescription('Manage buddy reads')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a buddy read with someone')
                .addStringOption(opt =>
                    opt.setName('book')
                        .setDescription('The book to read together')
                        .setRequired(true)
                )
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Your buddy')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List your current buddy reads')
        )
        .addSubcommand(sub =>
            sub.setName('finish')
                .setDescription('Mark a buddy read as finished')
                .addStringOption(opt =>
                    opt.setName('book')
                        .setDescription('The book you finished')
                        .setRequired(true)
                )
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Your buddy for this read')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let buddyReads = loadBuddyReads();

        // START
        if (sub === 'start') {
            const book = interaction.options.getString('book').trim();
            const buddy = interaction.options.getUser('user');
            if (buddy.id === userId) {
                return interaction.reply({ content: "You can't buddy read with yourself!" });
            }
            // Prevent duplicate
            if (buddyReads.some(br =>
                ((br.user1 === userId && br.user2 === buddy.id) || (br.user1 === buddy.id && br.user2 === userId))
                && br.book.toLowerCase() === book.toLowerCase()
                && br.status === 'active'
            )) {
                return interaction.reply({ content: `You already have an active buddy read for "${book}" with ${buddy.username}!` });
            }
            buddyReads.push({
                user1: userId,
                user2: buddy.id,
                book,
                status: 'active'
            });
            saveBuddyReads(buddyReads);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Buddy Read Started!')
                        .setDescription(`You and <@${buddy.id}> are now buddy reading **${book}**!`)
                        .setColor('#4ac4d7')
                ]
            });
        }

        // LIST
        if (sub === 'list') {
            const myReads = buddyReads.filter(br =>
                (br.user1 === userId || br.user2 === userId) && br.status === 'active'
            );
            if (myReads.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Buddy Reads')
                            .setDescription('You have no active buddy reads.')
                            .setColor('#4ac4d7')
                    ]
                });
            }
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Your Buddy Reads')
                        .setDescription(myReads.map(br =>
                            `**${br.book}** with <@${br.user1 === userId ? br.user2 : br.user1}>`
                        ).join('\n'))
                        .setColor('#4ac4d7')
                ]
            });
        }

        // FINISH
        if (sub === 'finish') {
            const book = interaction.options.getString('book').trim();
            const buddy = interaction.options.getUser('user');
            const idx = buddyReads.findIndex(br =>
                ((br.user1 === userId && br.user2 === buddy.id) || (br.user1 === buddy.id && br.user2 === userId))
                && br.book.toLowerCase() === book.toLowerCase()
                && br.status === 'active'
            );
            if (idx === -1) {
                return interaction.reply({ content: `No active buddy read for "${book}" with ${buddy.username} found.` });
            }
            buddyReads[idx].status = 'finished';
            saveBuddyReads(buddyReads);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Buddy Read Finished!')
                        .setDescription(`You and <@${buddy.id}> have finished reading **${book}**!`)
                        .setColor('#4ac4d7')
                ]
            });
        }
    }
}