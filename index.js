const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

const commands = [
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Show your profile!'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Register slash commands for a specific guild (server)
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );
        console.log('Slash command registered!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'profile') {
        await interaction.reply('Here is your profile! (Customize this response)');
    }
});

client.login(process.env.BOT_TOKEN);
