const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const profilesPath = path.join(__dirname, '../profiles.json');

function loadProfile(userId) {
    if (!fs.existsSync(profilesPath)) return null;
    const profiles = JSON.parse(fs.readFileSync(profilesPath));
    return profiles[userId];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your book profile'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const profile = loadProfile(userId);

        if (!profile) {
            await interaction.reply('You have not set a profile yet. Use `/setprofile` to create one!');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Book Profile`)
            .setColor('#572194')
            .addFields(
                { name: 'Bio', value: profile.bio },
                { name: 'Current Read', value: profile.currentRead },
                { name: '# Books Read This Year', value: profile.booksRead.toString() },
                { name: 'Favorite Genre', value: profile.favoriteGenre }
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};