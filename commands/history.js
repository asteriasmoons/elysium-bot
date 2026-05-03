const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const { TYPE_LABELS, formatDuration } = require("../utils/modUtils");

const PAGE_SIZE = 8;

async function buildHistoryEmbed(client, guildId, userId, typeFilter, page) {
  const query = { guildId, userId };
  if (typeFilter && typeFilter !== "all") query.type = typeFilter;

  const total = await ModerationCase.countDocuments(query);
  const cases = await ModerationCase.find(query)
    .sort({ caseId: -1 })
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const warnCount = await ModerationCase.countDocuments({
    guildId,
    userId,
    type: "warn",
    active: true,
  });

  // Try to fetch the user tag
  let targetTag = userId;
  let avatarURL = null;
  try {
    const user = await client.users.fetch(userId);
    targetTag = user.tag;
    avatarURL = user.displayAvatarURL();
  } catch (_) {}

  const lines = cases.map((c) => {
    const durationStr = formatDuration(c.duration);
    const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
    const label = TYPE_LABELS[c.type] || c.type;
    const activeFlag = c.active ? "" : " ~~(inactive)~~";
    return `\`#${c.caseId}\` **${label}**${activeFlag} — <t:${ts}:R>\n> ${(c.reason || "No reason").slice(0, 80)}${durationStr ? ` · ${durationStr}` : ""}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`Moderation History — ${targetTag}`)
    .setDescription(lines.length ? lines.join("\n\n") : "*No cases on this page.*")
    .addFields(
      { name: "Total Cases", value: String(total), inline: true },
      { name: "Active Warns", value: String(warnCount), inline: true },
      { name: "Page", value: `${page + 1} / ${totalPages}`, inline: true },
    )
    .setFooter({ text: `User ID: ${userId}` })
    .setTimestamp();

  if (avatarURL) embed.setThumbnail(avatarURL);

  // Build button rows
  // Row 1: View buttons for each case (up to 5 per row, max 2 rows = 10 buttons)
  const rows = [];
  const viewRows = [];
  const chunks = [];
  for (let i = 0; i < Math.min(cases.length, 10); i += 5) {
    chunks.push(cases.slice(i, i + 5));
  }
  for (const chunk of chunks) {
    const row = new ActionRowBuilder().addComponents(
      chunk.map((c) =>
        new ButtonBuilder()
          .setCustomId(`history_view_case:${c.caseId}:${guildId}`)
          .setLabel(`#${c.caseId}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );
    viewRows.push(row);
  }

  // Nav row: Prev / Next
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`history_page:${userId}:${typeFilter || "all"}:${page - 1}:${guildId}`)
      .setLabel("← Prev")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`history_page:${userId}:${typeFilter || "all"}:${page + 1}:${guildId}`)
      .setLabel("Next →")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page + 1 >= totalPages),
  );

  return {
    embed,
    components: [...viewRows, navRow].slice(0, 5), // Discord max 5 rows
    total,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("View a user's moderation history")
    .addStringOption((o) =>
      o
        .setName("user")
        .setDescription("Username, display name, or user ID")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Filter by action type")
        .setRequired(false)
        .addChoices(
          { name: "All", value: "all" },
          { name: "Bans", value: "ban" },
          { name: "Kicks", value: "kick" },
          { name: "Timeouts", value: "timeout" },
          { name: "Warns", value: "warn" },
          { name: "Notes", value: "note" },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const input = interaction.options.getString("user").trim();
    const typeFilter = interaction.options.getString("type") || "all";
    const guildId = interaction.guild.id;

    // Resolve user ID from input
    let userId = null;

    // Direct ID
    if (/^\d{17,20}$/.test(input)) {
      userId = input;
    }

    // Mention
    if (!userId) {
      const mentionMatch = input.match(/^<@!?(\d{17,20})>$/);
      if (mentionMatch) userId = mentionMatch[1];
    }

    // Username/display name search in guild
    if (!userId) {
      try {
        await interaction.guild.members.fetch();
        const lower = input.toLowerCase();
        const found = interaction.guild.members.cache.find(
          (m) =>
            m.user.username.toLowerCase() === lower ||
            m.user.tag.toLowerCase() === lower ||
            (m.nickname && m.nickname.toLowerCase() === lower) ||
            m.displayName.toLowerCase() === lower
        );
        if (found) userId = found.user.id;
      } catch (_) {}
    }

    // Try fetching directly from Discord as a fallback
    if (!userId) {
      try {
        const fetched = await interaction.client.users.fetch(input);
        if (fetched) userId = fetched.id;
      } catch (_) {}
    }

    if (!userId)
      return interaction.editReply({
        content: `Could not find a user matching **${input}**. Try using their user ID directly.`,
      });

    const { embed, components, total } = await buildHistoryEmbed(
      interaction.client,
      guildId,
      userId,
      typeFilter,
      0
    );

    if (total === 0)
      return interaction.editReply({
        content: `No moderation history found for that user.`,
      });

    await interaction.editReply({ embeds: [embed], components });
  },

  buildHistoryEmbed,
};
