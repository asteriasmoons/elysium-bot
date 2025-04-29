const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const profilesPath = path.join(__dirname, '../profiles.json');

function saveProfile(userId, profile) {
    let profiles = {};
    if (fs.existsSync(profilesPath)) {
        profiles = JSON.parse(fs.readFileSync(profilesPath));
    }
    profiles[userId] = profile;
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprofile')
        .setDescription('Set your book profile')
        .addStringOption(option =>
            option.setName('bio').setDescription('A short bio about you').setRequired(true))
        .addStringOption(option =>
            option.setName('current_read').setDescription('The book you are currently reading').setRequired(true))
        .addIntegerOption(option =>
            option.setName('books_read').setDescription('Number of books you have read this year').setRequired(true))
        .addStringOption(option =>
            option.setName('favorite_genre').setDescription('Your favorite book genre').setRequired(true)),
    async execute(interaction) {
        const bio = interaction.options.getString('bio');
        const currentRead = interaction.options.getString('current_read');
        const booksRead = interaction.options.getInteger('books_read');
        const favoriteGenre = interaction.options.getString('favorite_genre');
        const userId = interaction.user.id;

        saveProfile(userId, { bio, currentRead, booksRead, favoriteGenre });

        await interaction.reply('Your profile has been saved!');
    },
};