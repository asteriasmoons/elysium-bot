
require("dotenv").config();
const express = require("express");

const mongoose = require("mongoose");
const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  Partials,
} = require("discord.js");
const Agenda = require("agenda");
const { scheduleAllHabits } = require("./habitScheduler");
const startReminderScheduler = require("./utils/reminderScheduler");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URI,
    collection: "agendaJobs",
  },
  timezone: "America/Chicago",
  processEvery: "1 minute",
  maxConcurrency: 5,
  defaultConcurrency: 1,
  defaultLockLifetime: 10000,
});
module.exports.agenda = agenda;

const sprintState = {
  active: false,
  endTime: null,
  participants: {},
  duration: 0,
  timeout: null,
};

const sendEmbedRoute = require("./routes/api/sendEmbed");
const guildChannelsRoute = require("./routes/api/guildChannels");
const ticketPanelRoute = require("./routes/ticketpanel/send");
const guildRolesRoute = require("./routes/api/guildRoles");
const rolePanelSendRoute = require("./routes/role-panel/send");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.set("discordClient", client);
app.use("/", sendEmbedRoute);
app.use("/", guildChannelsRoute);
app.use("/", guildRolesRoute);
app.use("/api/ticketpanel", ticketPanelRoute);
app.use("/api/rolepanel", rolePanelSendRoute);

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "elysium-bot" });
});

app.get("/invite", (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <title>Invite Elysium</title>
  <meta name="description" content="Add Elysium to your Discord server." />

  <meta property="og:title" content="Invite Elysium" />
  <meta property="og:description" content="Add Elysium to your Discord server." />
  <meta property="og:image" content="https://bot.lystaria.im/elysium-invite-banner.png" />
  <meta property="og:url" content="https://bot.lystaria.im/invite" />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Invite Elysium" />
  <meta name="twitter:description" content="Add Elysium to your Discord server." />
  <meta name="twitter:image" content="https://bot.lystaria.im/elysium-invite-banner.png" />

  <meta http-equiv="refresh" content="1;url=https://discord.com/oauth2/authorize?client_id=1366843799451467797&scope=bot%20applications.commands&permissions=8" />
</head>
<body>
  <p>Redirecting to Elysium invite...</p>
  <a href="https://discord.com/oauth2/authorize?client_id=1366843799451467797&scope=bot%20applications.commands&permissions=8">
    Click here if you are not redirected.
  </a>
</body>
</html>
  `);
});
client.sprintTimeouts = new Map();
client.sprintState = sprintState;
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
      }
    }
  }
}
loadCommands(commandsPath);

const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.name && typeof event.execute === "function") {
      client.on(event.name, (...args) =>
        event.execute(...args, client, agenda),
      );
      console.log(`Loaded event: ${event.name}`);
    }
  }
}

client.once("ready", async () => {
  client.user.setPresence({
    activities: [{ name: "With magic 🔮", type: ActivityType.Streaming }],
  });
  console.log(`Bot ${client.user.tag} is now ready!`);

  client.agenda = agenda;
  scheduleAllHabits(client);
  startReminderScheduler(client);
  require("./agendaJobs")(agenda, client);
  await agenda.start();
  await agenda.purge();
});


app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

client.login(process.env.BOT_TOKEN);
