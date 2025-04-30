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

function loadProfiles() {
    if (fs.existsSync(profilesPath)) {
        return JSON.parse(fs.readFileSync(profilesPath));
    }
    return {};
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
            option.setName('reading_goal').setDescription('Your reading goal for this year').setRequired(true))
        .addStringOption(option =>
            option.setName('favorite_genre').setDescription('Your favorite book genre').setRequired(true))
        .addStringOption(option =>
            option.setName('preferred_format').setDescription('Preferred reading format (Physical, eBook, Audiobook, All)').setRequired(true))
        .addStringOption(option =>
            option.setName('favorite_author').setDescription('Your favorite author').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const profiles = loadProfiles();

        // Set or preserve memberSince
        let memberSince = profiles[userId]?.memberSince || new Date().toISOString();

        const bio = interaction.options.getString('bio');
        const currentRead = interaction.options.getString('current_read');
        const readingGoal = interaction.options.getInteger('reading_goal');
        const favoriteGenre = interaction.options.getString('favorite_genre');
        const preferredFormat = interaction.options.getString('preferred_format');
        const favoriteAuthor = interaction.options.getString('favorite_author');

        const profile = {
            bio,
            currentRead,
            readingGoal,
            favoriteGenre,
            preferredFormat,
            favoriteAuthor,
            memberSince
        };

        saveProfile(userId, profile);

        await interaction.reply('Your profile has been saved!');
    },
};