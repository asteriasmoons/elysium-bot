const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const profilesPath = path.join(__dirname, '../profiles.json');

function loadProfiles() {
    if (fs.existsSync(profilesPath)) {
        return JSON.parse(fs.readFileSync(profilesPath));
    }
    return {};
}

function saveProfiles(profiles) {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editprofile')
        .setDescription('Edit your book profile')
        .addStringOption(option =>
            option.setName('bio').setDescription('Edit your bio').setRequired(false))
        .addStringOption(option =>
            option.setName('current_read').setDescription('Edit your current read').setRequired(false))
        .addIntegerOption(option =>
            option.setName('reading_goal').setDescription('Edit your reading goal for this year').setRequired(false))
        .addStringOption(option =>
            option.setName('favorite_genre').setDescription('Edit your favorite genre').setRequired(false))
        .addStringOption(option =>
            option.setName('preferred_format').setDescription('Edit your preferred format (Physical, eBook, Audiobook, All)').setRequired(false))
        .addStringOption(option =>
            option.setName('favorite_author').setDescription('Edit your favorite author').setRequired(false)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const profiles = loadProfiles();

        if (!profiles[userId]) {
            await interaction.reply('You do not have a profile yet. Use `/setprofile` to create one!');
            return;
        }

        // Only update fields that are provided
        const bio = interaction.options.getString('bio');
        const currentRead = interaction.options.getString('current_read');
        const readingGoal = interaction.options.getInteger('reading_goal');
        const favoriteGenre = interaction.options.getString('favorite_genre');
        const preferredFormat = interaction.options.getString('preferred_format');
        const favoriteAuthor = interaction.options.getString('favorite_author');

        let updated = false;

        if (bio !== null) { profiles[userId].bio = bio; updated = true; }
        if (currentRead !== null) { profiles[userId].currentRead = currentRead; updated = true; }
        if (readingGoal !== null) { profiles[userId].readingGoal = readingGoal; updated = true; }
        if (favoriteGenre !== null) { profiles[userId].favoriteGenre = favoriteGenre; updated = true; }
        if (preferredFormat !== null) { profiles[userId].preferredFormat = preferredFormat; updated = true; }
        if (favoriteAuthor !== null) { profiles[userId].favoriteAuthor = favoriteAuthor; updated = true; }

        if (!updated) {
            await interaction.reply('You must provide at least one field to update.');
            return;
        }

        saveProfiles(profiles);

        await interaction.reply('Your profile has been updated!');
    },
};