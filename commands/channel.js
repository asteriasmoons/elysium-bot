const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandChannelOption,
  ChannelType,
  SlashCommandStringOption,
} = require("discord.js");
const ServerSettings = require("../models/ServerSettings");
const SprintConfig = require("../models/SprintConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Manage designated channels for bot features.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // Command requires Administrator permissions

    // --- 'set' subcommand GROUP ---
    .addSubcommandGroup((group) =>
      group
        .setName("set")
        .setDescription("Set a designated channel for a specific bot feature.")
        // 'sprints' subcommand under 'set' group
        .addSubcommand((sub) =>
          sub
            .setName("sprints")
            .setDescription("Set the channel for reading sprints.")
            .addChannelOption(
              (option) =>
                option
                  .setName("channel")
                  .setDescription("The channel to designate for sprints.")
                  .setRequired(true)
                  .addChannelTypes(ChannelType.GuildText) // Restrict to text channels
            )
        )
        // 'gifts' subcommand under 'set' group
        .addSubcommand((sub) =>
          sub
            .setName("gifts")
            .setDescription(
              "Set the channel for Book Fairy gift announcements."
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription(
                  "The channel to designate for gift announcements."
                )
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
    )

    // --- 'view' subcommand ---
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the currently designated channels.")
    )

    // --- 'reset' subcommand ---
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Reset (clear) a designated channel setting.")
        // Optional: type of channel setting to reset
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription(
              "The type of channel setting to reset (optional, resets all if omitted)."
            )
            .setRequired(false)
            .addChoices(
              { name: "Sprint Channel", value: "sprint" },
              { name: "Gift Announcement Channel", value: "gifts" }
            )
        )
    ),

  async execute(interaction) {
    // Ensure this command is only used in a guild (server)
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: false,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const subcommandGroup = interaction.options.getSubcommandGroup(); // Get the subcommand group (e.g., 'set')
    const subcommand = interaction.options.getSubcommand(); // Get the subcommand (e.g., 'sprints', 'gifts', 'view', 'reset')

    // --- Handle 'set' subcommand group ---
    if (subcommandGroup === "set") {
      // Explicit check for Administrator permissions, although setDefaultMemberPermissions is set
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Permission")
              .setDescription("Only admins can set designated channels.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: false,
        });
      }

      const designatedChannel = interaction.options.getChannel("channel");

      let updateField = {}; // Object to hold the Mongoose update
      let successMessage = "";

      if (subcommand === "sprints") {
        updateField = { sprintChannelId: designatedChannel.id };
        successMessage = `Successfully set the **Sprint Channel** to ${designatedChannel}!`;
      } else if (subcommand === "gifts") {
        updateField = { giftChannelId: designatedChannel.id };
        successMessage = `Successfully set the **Gift Announcement Channel** to ${designatedChannel}!`;
      }
      // No need for an else here due to command structure defining only 'sprints' and 'gifts'

      try {
        // Use findOneAndUpdate with upsert: true to find or create the server settings and update the channel ID
        await ServerSettings.findOneAndUpdate(
          { guildId: guildId }, // Filter: find settings for this guild
          updateField, // Use the dynamically created updateField
          {
            upsert: true, // Create settings if they don't exist for this guild
            new: true, // Return the updated/created document (optional here)
            setDefaultsOnInsert: true, // Apply schema defaults if a new doc is inserted
          }
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Channel Set")
              .setDescription(successMessage)
              .setColor("#4ac4d7"),
          ],
          ephemeral: false,
        });
      } catch (error) {
        console.error(
          `Error setting ${subcommand} channel for guild ${guildId}:`,
          error
        );
        await interaction.reply({
          content: `There was an error setting the ${subcommand} channel.`,
          ephemeral: false,
        });
      }
    }
    // --- Handle 'view' subcommand ---
    else if (subcommand === "view") {
      try {
        // Fetch the server settings
        const settings = await ServerSettings.findOne({ guildId: guildId });

        const embed = new EmbedBuilder()
          .setTitle("Designated Channels")
          .setColor("#4ac4d7");

        if (settings) {
          const sprintChannel = settings.sprintChannelId
            ? `<#${settings.sprintChannelId}>`
            : "Not set";
          const giftChannel = settings.giftChannelId
            ? `<#${settings.giftChannelId}>`
            : "Not set";

          embed
            .setDescription(`Here are the designated channels for this server:`)
            .addFields(
              { name: "Sprint Channel", value: sprintChannel, inline: false },
              {
                name: "Gift Announcement Channel",
                value: giftChannel,
                inline: false,
              }
            );
        } else {
          embed.setDescription(
            "No designated channels have been set for this server yet."
          );
        }

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(`Error viewing channels for guild ${guildId}:`, error);
        await interaction.reply({
          content: "There was an error fetching channel settings.",
          ephemeral: false,
        });
      }
    }
    // --- Handle 'reset' subcommand ---
    else if (subcommand === "reset") {
      // Explicit check for Administrator permissions
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("No Permission")
              .setDescription("Only admins can reset designated channels.")
              .setColor("#4ac4d7"),
          ],
          ephemeral: false,
        });
      }

      const channelTypeToReset = interaction.options.getString("type"); // 'sprint', 'gifts', or null if omitted

      let updateField = {}; // Object to hold the Mongoose update
      let successMessage = "";

      if (!channelTypeToReset) {
        // Reset all channels if type is omitted
        updateField = { sprintChannelId: null, giftChannelId: null };
        successMessage = "All designated channel settings have been cleared.";
      } else if (channelTypeToReset === "sprint") {
        updateField = { sprintChannelId: null };
        successMessage = "The Sprint Channel setting has been cleared.";
      } else if (channelTypeToReset === "gifts") {
        updateField = { giftChannelId: null };
        successMessage =
          "The Gift Announcement Channel setting has been cleared.";
      }
      // Should not happen due to choices if type is provided, but fallback if needed

      try {
        // Use findOneAndUpdate to update (set to null) or create (if settings didn't exist)
        await ServerSettings.findOneAndUpdate(
          { guildId: guildId },
          updateField, // Use the dynamically created updateField
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Channel Reset")
              .setDescription(successMessage)
              .setColor("#4ac4d7"),
          ],
          ephemeral: false,
        });
      } catch (error) {
        console.error(
          `Error resetting ${
            channelTypeToReset || "all"
          } channels for guild ${guildId}:`,
          error
        );
        await interaction.reply({
          content: `There was an error resetting channel settings.`,
          ephemeral: false,
        });
      }
    }
    // No need for an else at the end, as all valid subcommands are handled.
  },
};
