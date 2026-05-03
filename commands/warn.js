const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase, checkWarnEscalation } = require("../utils/modUtils");

async function resolveUser(interaction, input) {
  input = input.trim();
  const mention = input.match(/^<@!?(\d{17,20})>$/);
  if (mention) return interaction.client.users.fetch(mention[1]).catch(() => null);
  if (/^\d{17,20}$/.test(input)) return interaction.client.users.fetch(input).catch(() => null);
  await interaction.guild.members.fetch().catch(() => {});
  const lower = input.toLowerCase();
  const found = interaction.guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === lower ||
      m.user.tag.toLowerCase() === lower ||
      (m.nickname && m.nickname.toLowerCase() === lower) ||
      m.displayName.toLowerCase() === lower
  );
  return found ? found.user : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addStringOption((o) =>
      o.setName("user").setDescription("Username, display name, mention, or user ID").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the warn").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const input = interaction.options.getString("user");
    const reason = interaction.options.getString("reason");

    const target = await resolveUser(interaction, input);
    if (!target)
      return interaction.editReply({ content: `Could not find a user matching **${input}**.` });

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

    await checkWarnEscalation(
      interaction.client,
      interaction.guild,
      target.id,
      interaction.user.id,
      interaction.user.tag,
    );

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle(`Warned — Case #${caseDoc.caseId}`)
          .addFields(
            { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
            { name: "Reason", value: reason },
          )
          .setTimestamp(),
      ],
    });
  },
};
