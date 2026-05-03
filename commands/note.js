const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("note")
    .setDescription("Add an internal note to a user's moderation history")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to note").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("note").setDescription("The note content").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const note = interaction.options.getString("note");

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "note",
      reason: note,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: false,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`Note Added — Case #${caseDoc.caseId}`)
          .addFields(
            { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
            { name: "Note", value: note },
          )
          .setTimestamp(),
      ],
    });
  },
};
