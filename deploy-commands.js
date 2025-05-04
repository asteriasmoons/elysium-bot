const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Recursively read all .js files in commands and its subfolders
function readCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            readCommands(fullPath); // Recurse into subdirectory
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] The command at ${fullPath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

readCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
		console.log(commands); // Add this before the rest.put() call

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();