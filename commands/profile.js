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

const divider = '☽☾   ┈┈    ꒰    𖤐    ꒱   ┈┈  ☽☾  ';

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
        const user = interaction.options.getUser('user') || interaction.user;
        const profile = loadProfile(user.id);

        if (!profile) {
            await interaction.reply({
                content: `${user.id === interaction.user.id ? 'You have' : `${user.username} has`} not set a profile yet.${user.id === interaction.user.id ? ' Use \`/setprofile\` to create one!' : ''}`,
            });
            return;
        }

        // Divider above, field name bolded
        const profileText = 
            `${divider}\n**Bio**\n${profile.bio || 'Not set'}\n\n` +
            `${divider}\n**Current Read**\n${profile.currentRead || 'Not set'}\n\n` +
            `${divider}\n**Reading Goal**\n${profile.readingGoal ? profile.readingGoal.toString() : 'Not set'}\n\n` +
            `${divider}\n**Favorite Genre**\n${profile.favoriteGenre || 'Not set'}\n\n` +
            `${divider}\n**Preferred Format**\n${profile.preferredFormat || 'Not set'}\n\n` +
            `${divider}\n**Favorite Author**\n${profile.favoriteAuthor || 'Not set'}\n\n` +
            `${divider}\n**Member Since**\n${profile.memberSince ? formatDate(profile.memberSince) : 'Unknown'}`;

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Book Profile`)
            .setColor('#4ac4d7')
            .setThumbnail(user.displayAvatarURL())
            .addFields({ name: '\u200B', value: profileText, inline: false });

        await interaction.reply({ embeds: [embed] });
    },
};