const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Bulk delete messages in this channel")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (max 100)")
        .setRequired(true)
        .setMinValue(2) // Discord bulk delete requires minimum 2
        .setMaxValue(100),
    )
    .addStringOption((option) =>
      option
        .setName("bots")
        .setDescription("Include bot messages?")
        .addChoices({ name: "Yes", value: "yes" }, { name: "No", value: "no" })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    const botsIncluded = interaction.options.getString("bots") === "yes";

    await interaction.deferReply({ ephemeral: true });

    // Fetch more than needed to account for filtered-out messages and age filtering
    const fetched = await interaction.channel.messages.fetch({ limit: 100 });

    let messagesToDelete = botsIncluded
      ? fetched
      : fetched.filter((msg) => !msg.author.bot);

    // Slice to the requested amount
    messagesToDelete = messagesToDelete.first(amount);

    if (!messagesToDelete || messagesToDelete.length < 2) {
      return interaction.editReply({
        content:
          "Not enough messages to delete (minimum 2, and messages must be under 14 days old).",
      });
    }

    await interaction.channel
      .bulkDelete(messagesToDelete, true) // true = skip messages older than 14 days
      .then((deleted) =>
        interaction.editReply({
          content: `🧹 Deleted ${deleted.size} message${deleted.size !== 1 ? "s" : ""}${botsIncluded ? "" : " (bots excluded)"}.`,
        }),
      )
      .catch(() =>
        interaction.editReply({
          content:
            "Failed to delete messages. Make sure I have Manage Messages permission and messages are under 14 days old.",
        }),
      );
  },
};
