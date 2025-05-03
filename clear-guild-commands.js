const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1290766408501694464'; // <-- Replace with your server's ID

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );
    console.log('Cleared all guild commands!');
  } catch (error) {
    console.error(error);
  }
})();