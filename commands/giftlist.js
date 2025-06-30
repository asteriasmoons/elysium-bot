const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const ServerSettings = require("../models/ServerSettings"); // Assuming your ServerSettings model is here

module.exports = {
  // --- Command Definition ---
  data: new SlashCommandBuilder()
    .setName("giftlist") // The name of the command
    .setDescription(
      "Announce that you purchased a book from someone's gift list."
    ) // Command description
    // .setDMPermission(false) // *** REMOVED THIS LINE AS REQUESTED ***
    .addUserOption(
      (
        option // Option for the recipient user
      ) =>
        option
          .setName("recipient")
          .setDescription("The user who received the gifted book.")
          .setRequired(true)
    )
    .addStringOption(
      (
        option // Option for the book title
      ) =>
        option
          .setName("book_title")
          .setDescription("The title of the gifted book.")
          .setRequired(true)
    )
    .addStringOption(
      (
        option // Option for the author
      ) =>
        option
          .setName("author")
          .setDescription("The author of the gifted book.")
          .setRequired(true)
    ),

  // --- Command Execution ---
  async execute(interaction) {
    // Ensure this command is only used in a guild (server)
    if (!interaction.guild) {
      // *** ADDED A SPECIFIC MESSAGE FOR DM USAGE ***
      await interaction.reply({
        content:
          "This command needs to be used in a server to announce the gift in the designated channel.",
        ephemeral: false,
      });
      return;
    }

    // Get the options provided by the user
    const recipientUser = interaction.options.getUser("recipient");
    const bookTitle = interaction.options.getString("book_title");
    const author = interaction.options.getString("author");
    const giverUser = interaction.user; // The user who ran the command is the giver

    try {
      // Fetch the server settings to get the designated gifts channel ID
      const settings = await ServerSettings.findOne({
        guildId: interaction.guild.id,
      });

      // Check if a gifts channel has been set for this server
      if (!settings || !settings.giftChannelId) {
        await interaction.reply({
          content:
            "The Gift Announcement Channel has not been set for this server. An admin needs to set it using `/channel set gifts`.",
          ephemeral: false,
        });
        return;
      }

      // Get the actual channel object from the server's channels cache
      const giftsChannel = interaction.guild.channels.cache.get(
        settings.giftChannelId
      );

      // Check if the channel was found (it might have been deleted after being set)
      if (!giftsChannel) {
        await interaction.reply({
          content:
            "The designated Gift Announcement Channel was not found. Please ask an admin to set a new channel using `/channel set gifts`.",
          ephemeral: false,
        });
        return;
      }

      // Check if the bot has permission to send messages in that channel
      const botPermissions = giftsChannel.permissionsFor(
        interaction.client.user
      );
      if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
        await interaction.reply({
          content: `I don't have permission to send messages in the designated gift channel (${giftsChannel}). Please grant me the "Send Messages" permission there.`,
          ephemeral: false,
        });
        return;
      }

      // --- Construct the announcement message (text + embed) ---

      // The non-embed text content mentioning the giver and recipient
      const textContent = `${giverUser} and ${recipientUser}`;

      // The embed for the book and message
      const announcementEmbed = new EmbedBuilder()
        .setTitle("The Book Fairy Arrived!") // Embed title
        .setColor("#4ac4d7") // Using the same color as your profile embed
        .setDescription(
          `The book **${bookTitle}** has been purchased from a gift list by *${author}* for the mentioned users! Don't forget to thank your book fairy! Happy reading!`
        )
        .setTimestamp(); // Optional: add a timestamp

      // --- Send the message to the designated channel ---
      await giftsChannel.send({
        content: textContent, // The non-embed mention line
        embeds: [announcementEmbed], // The embed
      });

      // --- Reply to the user who used the command (giver) ---
      await interaction.reply({
        content: `Successfully announced the gifted book in ${giftsChannel}!`,
        ephemeral: false, // Only show this confirmation to the giver
      });
    } catch (error) {
      console.error(
        `Error announcing gifted book for guild ${interaction.guild?.id}:`,
        error
      ); // Added ?. for safety
      await interaction.reply({
        content: "There was an error trying to announce the gifted book.",
        ephemeral: false,
      });
    }
  },
};
