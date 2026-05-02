const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to kick").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the kick").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: "You cannot kick yourself." });

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member)
      return interaction.editReply({ content: "That user is not in this server." });
    if (!member.kickable)
      return interaction.editReply({ content: "I don't have permission to kick that user." });
    if (
      member.roles.highest.position >=
      interaction.guild.members.me.roles.highest.position
    )
      return interaction.editReply({ content: "That user's role is higher than or equal to mine." });

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "kick",
      reason,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: true,
    });

    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`👢 Kicked — Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
