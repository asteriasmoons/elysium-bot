const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createCase } = require("../utils/modUtils");

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
    .setName("note")
    .setDescription("Add an internal note to a user's moderation history")
    .addStringOption((o) =>
      o.setName("user").setDescription("Username, display name, mention, or user ID").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("note").setDescription("The note content").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const input = interaction.options.getString("user");
    const note = interaction.options.getString("note");

    const target = await resolveUser(interaction, input);
    if (!target)
      return interaction.editReply({ content: `Could not find a user matching **${input}**.` });

    const caseDoc = await createCase(interaction.client, {
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "note",
      reason: note,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      guildName: interaction.guild.name,
      dmUser: false,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`Note Added — Case #${caseDoc.caseId}`)
          .addFields(
            { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
            { name: "Note", value: note },
          )
          .setTimestamp(),
      ],
    });
  },
};
