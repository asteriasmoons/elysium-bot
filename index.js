require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

// Sprint state
const sprintState = {
    active: false,
    endTime: null,
    participants: {},
    duration: 0,
    timeout: null,
};

// Add reminders module
const reminders = require('./commands/reminders.js');

// Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMembers
    ]
});
client.sprintTimeouts = new Map();
client.sprintState = sprintState;
client.commands = new Collection();

// Load commands (including from subfolders)
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath); // Recursively load subfolders
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}
loadCommands(commandsPath);

// Load events from /events folder
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.name && typeof event.execute === 'function') {
            client.on(event.name, (...args) => event.execute(...args));
            console.log(`Loaded event: ${event.name}`);
        }
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
	reminders.init(client); // <-- MOVE IT HERE
});

client.login(process.env.BOT_TOKEN);