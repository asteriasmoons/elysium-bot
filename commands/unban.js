const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption((o) =>
      o.setName("user_id").setDescription("The user ID to unban").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the unban").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString("user_id").trim();
    const reason = interaction.options.getString("reason") || "No reason provided";

    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans?.has(userId))
      return interaction.editReply({ content: "That user is not banned." });

    const bannedUser = bans.get(userId).user;

    await interaction.guild.bans.remove(userId, reason);

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId,
      moderatorId: interaction.user.id,
      type: "unban",
      reason,
      targetTag: bannedUser.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: true,
    });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`✅ Unbanned — Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${bannedUser.tag} (${userId})`, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
