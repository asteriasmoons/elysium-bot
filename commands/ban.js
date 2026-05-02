const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { createCase } = require("../utils/modUtils");

const DURATION_MAP = {
  "10m": 10 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  permanent: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((o) =>
      o.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the ban").setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName("duration")
        .setDescription("Temp ban duration (default: permanent)")
        .setRequired(false)
        .addChoices(
          { name: "10 minutes", value: "10m" },
          { name: "1 hour", value: "1h" },
          { name: "6 hours", value: "6h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "3 days", value: "3d" },
          { name: "7 days", value: "7d" },
          { name: "30 days", value: "30d" },
          { name: "Permanent", value: "permanent" }
        )
    )
    .addIntegerOption((o) =>
      o
        .setName("delete_days")
        .setDescription("Days of messages to delete (0–7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const durationKey = interaction.options.getString("duration") || "permanent";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const duration = DURATION_MAP[durationKey];

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: "You cannot ban yourself." });
    if (target.id === interaction.client.user.id)
      return interaction.editReply({ content: "I cannot ban myself." });

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member) {
      if (!member.bannable)
        return interaction.editReply({ content: "I don't have permission to ban that user." });
      if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
      )
        return interaction.editReply({ content: "That user's role is higher than or equal to mine." });
    }

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "ban",
      reason,
      duration,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: true,
    });

    await interaction.guild.members.ban(target.id, {
      reason,
      deleteMessageDays: deleteDays,
    });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`🔨 Banned — Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Duration", value: durationKey === "permanent" ? "Permanent" : durationKey, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
