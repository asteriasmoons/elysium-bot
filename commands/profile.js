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
        .setDescription('View your book profile')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to view (optional)')
                .setRequired(false)
        ),
    async execute(interaction) {
        // Get the user option, or fallback to the command user
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        const profile = loadProfile(user.id);

        if (!profile) {
            await interaction.reply({
                content: `${user.id === interaction.user.id ? 'You have' : `${user.username} has`} not set a profile yet.${user.id === interaction.user.id ? ' Use `/setprofile` to create one!' : ''}`,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Book Profile`)
            .setColor('#4ac4d7')
            .addFields(
                { name: 'Bio', value: profile.bio },
                { name: 'Current Read', value: profile.currentRead },
                { name: '# Books Read This Year', value: profile.booksRead.toString() },
                { name: 'Favorite Genre', value: profile.favoriteGenre }
            )
            .setThumbnail(user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};