const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const ModerationConfig = require("../models/ModerationConfig");
const AppealEntry = require("../models/AppealEntry");
const { TYPE_LABELS } = require("../utils/modUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("appeal")
    .setDescription("Appeal a moderation action taken against you")
    .addIntegerOption((o) =>
      o.setName("case_id").setDescription("The case ID you want to appeal").setRequired(true).setMinValue(1)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Why should this be overturned?").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const caseId = interaction.options.getInteger("case_id");
    const reason = interaction.options.getString("reason");
    const guildId = interaction.guild?.id;

    if (!guildId)
      return interaction.editReply({ content: "This command must be used in a server." });

    const caseDoc = await ModerationCase.findOne({ guildId, caseId });
    if (!caseDoc)
      return interaction.editReply({ content: `Case #${caseId} not found in this server.` });

    if (caseDoc.userId !== interaction.user.id)
      return interaction.editReply({ content: "You can only appeal cases that belong to you." });

    const existing = await AppealEntry.findOne({
      guildId,
      caseId,
      userId: interaction.user.id,
    });
    if (existing)
      return interaction.editReply({
        content: `You have already submitted an appeal for Case #${caseId}. Status: **${existing.status}**.`,
      });

    const config = await ModerationConfig.findOne({ guildId });
    if (!config?.appealChannelId)
      return interaction.editReply({
        content: "This server has not configured an appeal channel. Contact a staff member directly.",
      });

    const appealChannel = await interaction.client.channels
      .fetch(config.appealChannelId)
      .catch(() => null);
    if (!appealChannel)
      return interaction.editReply({ content: "The appeal channel could not be found." });

    const appeal = await AppealEntry.create({
      guildId,
      caseId,
      userId: interaction.user.id,
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📬 New Appeal — Case #${caseId}`)
      .addFields(
        { name: "User", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: "Case Type", value: TYPE_LABELS[caseDoc.type] || caseDoc.type, inline: true },
        { name: "Original Reason", value: caseDoc.reason || "No reason provided" },
        { name: "Appeal Reason", value: reason },
      )
      .setFooter({ text: `Appeal ID: ${appeal._id} • Case #${caseId}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal_approve:${appeal._id}`)
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`appeal_deny:${appeal._id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger),
    );

    await appealChannel.send({ embeds: [embed], components: [row] });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Appeal Submitted")
          .setDescription(`Your appeal for Case #${caseId} has been submitted to the staff team. You will be notified via DM when a decision is made.`),
      ],
    });
  },
};
