const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const { TYPE_LABELS, TYPE_COLORS, formatDuration } = require("../utils/modUtils");

const PAGE_SIZE = 6;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("View a user's moderation history")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to look up").setRequired(true)
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
    .addIntegerOption((o) =>
      o.setName("page").setDescription("Page number").setMinValue(1).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const typeFilter = interaction.options.getString("type") || "all";
    const page = (interaction.options.getInteger("page") || 1) - 1;

    const query = { guildId: interaction.guild.id, userId: target.id };
    if (typeFilter !== "all") query.type = typeFilter;

    const total = await ModerationCase.countDocuments(query);
    const cases = await ModerationCase.find(query)
      .sort({ caseId: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();

    if (total === 0) {
      return interaction.editReply({
        content: `No moderation history found for **${target.tag}**.`,
      });
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const warnCount = await ModerationCase.countDocuments({
      guildId: interaction.guild.id,
      userId: target.id,
      type: "warn",
      active: true,
    });

    const lines = cases.map((c) => {
      const durationStr = formatDuration(c.duration);
      const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
      return [
        `**Case #${c.caseId}** — ${TYPE_LABELS[c.type] || c.type}`,
        `> <t:${ts}:R> | ${c.reason || "No reason"}${durationStr ? ` | ${durationStr}` : ""}`,
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`Moderation History — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(lines.join("\n\n"))
      .addFields(
        { name: "Total Cases", value: String(total), inline: true },
        { name: "Active Warns", value: String(warnCount), inline: true },
        { name: "Page", value: `${page + 1} / ${totalPages}`, inline: true },
      )
      .setFooter({ text: `User ID: ${target.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
