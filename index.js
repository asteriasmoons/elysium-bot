require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, ActivityType } = require('discord.js');
const Agenda = require('agenda'); // <-- Make sure to import Agenda!
const { scheduleAllHabits } = require('./habitScheduler');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

// Agenda setup (use process.env.MONGO_URI, not mongoConnectionString)
const agenda = new Agenda({ 
    db: { 
        address: process.env.MONGO_URI, 
        collection: 'agendaJobs' },
        timezone: 'America/Chicago'
     });

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
    client.user.setPresence({
        activities: [
            { name: 'With magic 🔮', type: ActivityType.Streaming }
        ],
    });
    console.log(`Bot ${client.user.tag} is now ready!`);

    client.agenda = agenda;
    reminders.init(client); // Assuming 'reminders' is defined
    scheduleAllHabits(client);
    require('./agendaJobs')(agenda, client); // Assuming 'agenda' is defined
    agenda.start();

}); // <<< This is the closing of client.once('ready', async () => { ... })

client.login(process.env.BOT_TOKEN);