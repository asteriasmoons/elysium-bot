require("dotenv").config(); // So you can use your .env BOT_TOKEN

const { Client, GatewayIntentBits } = require("discord.js");

// Discord client with necessary intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Your existing client setup, requires, etc., would be above this

client.once("ready", async () => {
  console.log(`Bot ${client.user.tag} is now ready!`);

  // === THIS IS WHERE THE COMMAND FETCHING LOGIC SHOULD GO ===
  console.log(
    "Fetching global application (slash) commands to get their IDs..."
  );

  if (!client.application) {
    console.error(
      "Error: client.application is not available. Ensure this is a bot token and the client is fully initialized."
    );
    return; // Exit this part of the ready function if client.application isn't ready
  }

  try {
    // Fetch all global commands registered to your application
    const commands = await client.application.commands.fetch(); // 'await' is now inside an async function

    if (commands.size === 0) {
      console.log("No global slash commands found registered for this bot.");
      console.log("Please ensure your commands have been deployed globally.");
      return; // Exit this part if no commands are found
    }

    console.log("\n--- Your Bot's Global Slash Commands ---");
    commands.forEach((command) => {
      console.log("-----------------------------------------");
      console.log(`Command Name: /${command.name}`);
      console.log(`Command ID: ${command.id}`);
      console.log(`Mention String: </${command.name}:${command.id}>`);

      // Check for and list subcommands/subcommand groups for correct mention format
      if (command.options && command.options.length > 0) {
        command.options.forEach((option) => {
          // Type 1 is SUB_COMMAND, Type 2 is SUB_COMMAND_GROUP
          if (option.type === 1) {
            // SUB_COMMAND
            console.log(`Subcommand: ${option.name}`);
            console.log(
              `Mention String: </${command.name} ${option.name}:${command.id}>`
            );
          } else if (option.type === 2) {
            // SUB_COMMAND_GROUP
            console.log(`Subcommand Group: ${option.name}`);
            if (option.options && option.options.length > 0) {
              option.options.forEach((subGroupOption) => {
                if (subGroupOption.type === 1) {
                  // SUB_COMMAND
                  console.log(`Subcommand: ${subGroupOption.name}`);
                  // Corrected the mention string for subcommand within a group
                  console.log(
                    `Mention String: </${command.name} ${option.name} ${subGroupOption.name}:${command.id}>`
                  );
                }
              });
            }
          }
        });
      }
      console.log("-----------------------------------------");
    });
    console.log('\nYou can use these "Mention Strings" in your embeds.\n');
  } catch (error) {
    console.error("Error fetching global slash commands:", error);
  }
  // === END OF COMMAND FETCHING LOGIC ===
}); // <<< This is the closing of client.once('ready', async () => { ... })

client.login(process.env.BOT_TOKEN);
