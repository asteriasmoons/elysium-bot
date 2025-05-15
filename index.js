require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const Agenda = require('agenda'); // <-- Make sure to import Agenda!


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

// Agenda setup (use process.env.MONGO_URI, not mongoConnectionString)
const agenda = new Agenda({ db: { address: process.env.MONGO_URI, collection: 'agendaJobs' } });

// Sprint state (legacy, can be removed if not used elsewhere)
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
            // Pass agenda and client to events if needed
            client.on(event.name, (...args) => event.execute(...args, client, agenda));
            console.log(`Loaded event: ${event.name}`);
        }
    }
}

// Your existing client setup, requires, etc., would be above this

client.once('ready', async () => { // <<< Added 'async' here
    console.log(`Bot ${client.user.tag} is now ready!`);

    client.user.setPresence({
    activities: [{ name: 'With wellness and books', type: ActivityType.Playing }],
    status: 'online'
});

    client.agenda = agenda;
    reminders.init(client); // Assuming 'reminders' is defined
    require('./agendaJobs')(agenda, client); // Assuming 'agenda' is defined
    agenda.start();

    // === THIS IS WHERE THE COMMAND FETCHING LOGIC SHOULD GO ===
    console.log('Fetching global application (slash) commands to get their IDs...');

    if (!client.application) {
        console.error('Error: client.application is not available. Ensure this is a bot token and the client is fully initialized.');
        return; // Exit this part of the ready function if client.application isn't ready
    }

    try {
        // Fetch all global commands registered to your application
        const commands = await client.application.commands.fetch(); // 'await' is now inside an async function

        if (commands.size === 0) {
            console.log('No global slash commands found registered for this bot.');
            console.log('Please ensure your commands have been deployed globally.');
            return; // Exit this part if no commands are found
        }

        console.log('\n--- Your Bot\'s Global Slash Commands ---');
        commands.forEach(command => {
            console.log('-----------------------------------------');
            console.log(`Command Name: /${command.name}`);
            console.log(`Command ID: ${command.id}`);
            console.log(`Mention String: </${command.name}:${command.id}>`);

            // Check for and list subcommands/subcommand groups for correct mention format
            if (command.options && command.options.length > 0) {
                command.options.forEach(option => {
                    // Type 1 is SUB_COMMAND, Type 2 is SUB_COMMAND_GROUP
                    if (option.type === 1) { // SUB_COMMAND
                        console.log(`  Subcommand: ${option.name}`);
                        console.log(`  Mention String: </${command.name} ${option.name}:${command.id}>`);
                    } else if (option.type === 2) { // SUB_COMMAND_GROUP
                        console.log(`  Subcommand Group: ${option.name}`);
                        if (option.options && option.options.length > 0) {
                            option.options.forEach(subGroupOption => {
                                if (subGroupOption.type === 1) { // SUB_COMMAND
                                    console.log(`Subcommand: ${subGroupOption.name}`);
                                    // Corrected the mention string for subcommand within a group
                                    console.log(`Mention String: </${command.name} ${option.name} ${subGroupOption.name}:${command.id}>`);
                                }
                            });
                        }
                    }
                });
            }
            console.log('-----------------------------------------');
        });
        console.log('\nYou can use these "Mention Strings" in your embeds.\n');

    } catch (error) {
        console.error('Error fetching global slash commands:', error);
    }
    // === END OF COMMAND FETCHING LOGIC ===

}); // <<< This is the closing of client.once('ready', async () => { ... })

client.login(process.env.BOT_TOKEN);