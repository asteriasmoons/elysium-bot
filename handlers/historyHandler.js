const { EmbedBuilder } = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const { TYPE_LABELS, TYPE_COLORS, formatDuration } = require("../utils/modUtils");
const { buildHistoryEmbed } = require("../commands/history");

// View a specific case by ID — triggered by the # buttons on /history
async function handleViewCase(interaction) {
  await interaction.deferUpdate();

  const parts = interaction.customId.split(":");
  const caseId = parseInt(parts[1]);
  const guildId = parts[2];

  const caseDoc = await ModerationCase.findOne({ guildId, caseId });
  if (!caseDoc)
    return interaction.followUp({ content: `Case #${caseId} not found.`, ephemeral: true });

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

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

// Navigate to a different page on /history
async function handleHistoryPage(interaction) {
  await interaction.deferUpdate();

  const parts = interaction.customId.split(":");
  const userId = parts[1];
  const typeFilter = parts[2];
  const page = parseInt(parts[3]);
  const guildId = parts[4];

  const { embed, components } = await buildHistoryEmbed(
    interaction.client,
    guildId,
    userId,
    typeFilter,
    page
  );

  await interaction.editReply({ embeds: [embed], components });
}

module.exports = { handleViewCase, handleHistoryPage };
