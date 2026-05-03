const { EmbedBuilder } = require("discord.js");
const AppealEntry = require("../models/AppealEntry");
const ModerationCase = require("../models/ModerationCase");

async function handleAppealButton(interaction) {
  const [action, appealId] = interaction.customId.split(":");
  const approved = action === "appeal_approve";

  await interaction.deferUpdate();

  const appeal = await AppealEntry.findById(appealId);
  if (!appeal) {
    return interaction.editReply({ content: "Appeal not found.", components: [] });
  }

  if (appeal.status !== "pending") {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`This appeal has already been **${appeal.status}**.`),
      ],
      components: [],
    });
  }

  appeal.status = approved ? "approved" : "denied";
  appeal.reviewedBy = interaction.user.id;
  await appeal.save();

  // If approved, mark the original case inactive
  if (approved) {
    await ModerationCase.findOneAndUpdate(
      { guildId: appeal.guildId, caseId: appeal.caseId },
      { active: false }
    );
  }

  // DM the user the outcome
  try {
    const user = await interaction.client.users.fetch(appeal.userId);
    const dmEmbed = new EmbedBuilder()
      .setColor(approved ? 0x57f287 : 0xed4245)
      .setTitle(`Appeal ${approved ? "Approved" : "Denied"} — Case #${appeal.caseId}`)
      .setDescription(
        approved
          ? "Your appeal has been approved by the staff team. The case has been marked inactive."
          : "Your appeal has been reviewed and denied by the staff team."
      )
      .setTimestamp();

    await user.send({ embeds: [dmEmbed] });
  } catch (_) {}

  // Update the appeal embed
  const resultEmbed = new EmbedBuilder()
    .setColor(approved ? 0x57f287 : 0xed4245)
    .setTitle(`Appeal ${approved ? "Approved" : "Denied"} | Case #${appeal.caseId}`)
    .addFields(
      { name: "Reviewed By", value: `${interaction.user.tag}`, inline: true },
      { name: "Decision", value: approved ? "Approved" : "Denied", inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [resultEmbed], components: [] });
}

module.exports = { handleAppealButton };
