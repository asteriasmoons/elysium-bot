const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const profilesPath = path.join(__dirname, '../profiles.json');

function loadProfile(userId) {
    if (!fs.existsSync(profilesPath)) return null;
    const profiles = JSON.parse(fs.readFileSync(profilesPath));
    return profiles[userId];
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Your custom emoji
const customEmoji = '<:zts7:1343353133425885284>';

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

        const profile = loadProfile(user.id);

        if (!profile) {
            await interaction.reply({
                content: `${user.id === interaction.user.id ? 'You have' : `${user.username} has`} not set a profile yet.${user.id === interaction.user.id ? ' Use \`/setprofile\` to create one!' : ''}`,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Book Profile`)
            .setColor('#4ac4d7')
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: `${customEmoji} Bio`, value: profile.bio || 'Not set', inline: false },
                { name: `${customEmoji} Current Read`, value: profile.currentRead || 'Not set', inline: false },
                { name: `${customEmoji} Reading Goal`, value: profile.readingGoal ? profile.readingGoal.toString() : 'Not set', inline: false },
                { name: `${customEmoji} Favorite Genre`, value: profile.favoriteGenre || 'Not set', inline: false },
                { name: `${customEmoji} Preferred Format`, value: profile.preferredFormat || 'Not set', inline: false },
                { name: `${customEmoji} Favorite Author`, value: profile.favoriteAuthor || 'Not set', inline: false },
                { name: `${customEmoji} Member Since`, value: profile.memberSince ? formatDate(profile.memberSince) : 'Unknown', inline: false }
            );

        await interaction.reply({ embeds: [embed] });
    },
};