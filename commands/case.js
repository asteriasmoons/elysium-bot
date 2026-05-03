const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const { TYPE_LABELS, TYPE_COLORS, formatDuration } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("View a specific moderation case")
    .addIntegerOption((o) =>
      o.setName("id").setDescription("The case ID").setRequired(true).setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const caseId = interaction.options.getInteger("id");
    const caseDoc = await ModerationCase.findOne({
      guildId: interaction.guild.id,
      caseId,
    });

    if (!caseDoc)
      return interaction.editReply({ content: `Case #${caseId} not found.` });

    let targetTag = caseDoc.userId;
    let modTag = caseDoc.moderatorId;
    let avatarURL = null;

    try {
      const targetUser = await interaction.client.users.fetch(caseDoc.userId);
      targetTag = targetUser.tag;
      avatarURL = targetUser.displayAvatarURL();
    } catch (_) {}

    try {
      const modUser = await interaction.client.users.fetch(caseDoc.moderatorId);
      modTag = modUser.tag;
    } catch (_) {}

    const durationStr = formatDuration(caseDoc.duration);

    const embed = new EmbedBuilder()
      .setColor(TYPE_COLORS[caseDoc.type] || 0x5865f2)
      .setTitle(`${TYPE_LABELS[caseDoc.type] || caseDoc.type} | Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${targetTag} (<@${caseDoc.userId}>)`, inline: true },
        { name: "Moderator", value: `${modTag} (<@${caseDoc.moderatorId}>)`, inline: true },
        { name: "Active", value: caseDoc.active ? "Yes" : "No", inline: true },
        ...(durationStr ? [{ name: "Duration", value: durationStr, inline: true }] : []),
        ...(caseDoc.expiresAt
          ? [{ name: "Expires", value: `<t:${Math.floor(caseDoc.expiresAt.getTime() / 1000)}:R>`, inline: true }]
          : []),
        { name: "Reason", value: caseDoc.reason || "No reason provided" },
      )
      .setFooter({ text: `Case #${caseDoc.caseId} • User ID: ${caseDoc.userId}` })
      .setTimestamp(caseDoc.createdAt);

    if (avatarURL) embed.setThumbnail(avatarURL);

    return interaction.editReply({ embeds: [embed] });
  },
};
