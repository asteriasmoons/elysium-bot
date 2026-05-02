const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a timeout from a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to untimeout").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member)
      return interaction.editReply({ content: "That user is not in this server." });
    if (!member.isCommunicationDisabled())
      return interaction.editReply({ content: "That user is not currently timed out." });

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "untimeout",
      reason,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: true,
    });

    await member.timeout(null, reason);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`✅ Timeout Removed — Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
