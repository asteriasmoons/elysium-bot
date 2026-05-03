const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

const TIMEOUT_DURATION_MAP = {
  "60s": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "10m": 10 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "28d": 28 * 24 * 60 * 60 * 1000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout or remove a timeout from a member")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Timeout a member")
        .addUserOption((o) =>
          o.setName("user").setDescription("The user to timeout").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("duration")
            .setDescription("Timeout duration")
            .setRequired(true)
            .addChoices(
              { name: "60 seconds", value: "60s" },
              { name: "5 minutes", value: "5m" },
              { name: "10 minutes", value: "10m" },
              { name: "30 minutes", value: "30m" },
              { name: "1 hour", value: "1h" },
              { name: "3 hours", value: "3h" },
              { name: "6 hours", value: "6h" },
              { name: "12 hours", value: "12h" },
              { name: "1 day", value: "1d" },
              { name: "3 days", value: "3d" },
              { name: "7 days", value: "7d" },
              { name: "28 days", value: "28d" }
            )
        )
        .addStringOption((o) =>
          o.setName("reason").setDescription("Reason for the timeout").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a timeout from a member")
        .addUserOption((o) =>
          o.setName("user").setDescription("The user to untimeout").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("reason").setDescription("Reason").setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const target = interaction.options.getUser("user");
      const durationKey = interaction.options.getString("duration");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const duration = TIMEOUT_DURATION_MAP[durationKey];

      if (target.id === interaction.user.id)
        return interaction.editReply({ content: "You cannot timeout yourself." });

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member)
        return interaction.editReply({ content: "That user is not in this server." });
      if (!member.moderatable)
        return interaction.editReply({ content: "I don't have permission to timeout that user." });

      const caseDoc = await createCase(interaction.client, {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        type: "timeout",
        reason,
        duration,
        targetTag: target.tag,
        moderatorTag: interaction.user.tag,
        guildName: interaction.guild.name,
        dmUser: true,
      });

      await member.timeout(duration, reason);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle(`Timed Out — Case #${caseDoc.caseId}`)
            .addFields(
              { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
              { name: "Duration", value: durationKey, inline: true },
              { name: "Reason", value: reason },
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === "remove") {
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

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`Timeout Removed — Case #${caseDoc.caseId}`)
            .addFields(
              { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
              { name: "Reason", value: reason },
            )
            .setTimestamp(),
        ],
      });
    }
  },
};
