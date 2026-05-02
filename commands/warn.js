const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase, checkWarnEscalation } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to warn").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the warn").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: "You cannot warn yourself." });
    if (target.bot)
      return interaction.editReply({ content: "You cannot warn a bot." });

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member)
      return interaction.editReply({ content: "That user is not in this server." });

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "warn",
      reason,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: true,
    });

    // Check escalation after creating the warn
    await checkWarnEscalation(
      interaction.client,
      interaction.guild,
      target.id,
      interaction.user.id,
      interaction.user.tag,
    );

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle(`⚠️ Warned — Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
