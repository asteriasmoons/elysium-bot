const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Confession = require("../models/Confession");
const ConfessionConfig = require("../models/ConfessionConfig");

// ─── Shared helper ───────────────────────────────────────────────────────────

function buildThreadButtons(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confession_reply:${messageId}`)
      .setLabel("Reply Anonymously")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`confession_report:${messageId}`)
      .setLabel("Report")
      .setStyle(ButtonStyle.Danger),
  );
}

// ─── Main confession button (panel) ──────────────────────────────────────────

async function handleButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("confession_submit")
    .setTitle("Submit a Confession")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("confessionText")
          .setLabel("What would you like to share?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
  return interaction.showModal(modal);
}

// ─── Main confession modal submit ─────────────────────────────────────────────

async function handleModalSubmit(interaction) {
  const confessionText = interaction.fields.getTextInputValue("confessionText");
  const guildId = interaction.guildId;

  const config = await ConfessionConfig.findOne({ guildId });
  if (!config) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e3cff)
          .setTitle("Confession System Not Set Up")
          .setDescription("Please ask an admin to run `/confessions setup` first."),
      ],
      ephemeral: true,
    });
  }

  const last = await Confession.findOne({ guildId }).sort({ confessionId: -1 });
  const newId = last ? last.confessionId + 1 : 1;

  // ── Approve-first mode ──
  if (config.approveFirst && config.approverUserId) {
    await Confession.create({
      guildId,
      confessionId: newId,
      content: confessionText,
      status: "pending",
    });

    try {
      const approver = await interaction.client.users.fetch(config.approverUserId);
      const previewEmbed = new EmbedBuilder()
        .setColor(0x9e3cff)
        .setTitle(`Pending Confession #${newId}`)
        .setDescription(confessionText)
        .setFooter({ text: `Guild: ${interaction.guild.name}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confession_approve:${guildId}:${newId}`)
          .setLabel("Approve")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`confession_decline:${guildId}:${newId}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger),
      );

      await approver.send({ embeds: [previewEmbed], components: [row] });
    } catch (err) {
      console.error("[confessions] Failed to DM approver:", err);
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e3cff)
          .setTitle("Confession Submitted")
          .setDescription("Your confession is pending approval and will be posted once reviewed."),
      ],
      ephemeral: true,
    });
  }

  // ── Normal (no approval required) ──
  await Confession.create({ guildId, confessionId: newId, content: confessionText });

  const embedTitle = config.embedTitle.replace("{id}", newId);
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(confessionText)
    .setColor(0x9e3cff)
    .setTimestamp();

  const targetChannel = await interaction.client.channels
    .fetch(config.confessionChannelId)
    .catch(() => null);

  if (!targetChannel) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9e3cff)
          .setTitle("Confession Channel Missing")
          .setDescription(
            "Could not find the configured confession channel. Ask an admin to re-run `/confessions setup`.",
          ),
      ],
      ephemeral: true,
    });
  }

  const message = await targetChannel.send({ embeds: [embed] });

  try {
    const thread = await message.startThread({
      name: `Confession #${newId}`,
      autoArchiveDuration: 1440,
    });

    await thread.send({
      content: "Use the buttons below to reply anonymously or report this confession.",
      components: [buildThreadButtons(message.id)],
    });
  } catch (err) {
    console.error("[confessions] Failed to create thread:", err);
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9e3cff)
        .setTitle("Confession Sent")
        .setDescription("Your anonymous confession has been submitted successfully."),
    ],
    ephemeral: true,
  });
}

// ─── Approve button ────────────────────────────────────────────────────────────

async function handleApproveButton(interaction) {
  const [, guildId, idStr] = interaction.customId.split(":");
  const confessionId = parseInt(idStr);

  const confession = await Confession.findOne({ guildId, confessionId });
  if (!confession || confession.status !== "pending") {
    return interaction.update({
      content: "This confession has already been processed.",
      components: [],
    });
  }

  confession.status = "approved";
  await confession.save();

  const config = await ConfessionConfig.findOne({ guildId });
  if (!config) {
    return interaction.update({
      content: "Confession config not found for this guild.",
      components: [],
    });
  }

  const targetChannel = await interaction.client.channels
    .fetch(config.confessionChannelId)
    .catch(() => null);

  if (!targetChannel) {
    return interaction.update({
      content: "Could not find the confession channel — please check the server config.",
      components: [],
    });
  }

  const embedTitle = config.embedTitle.replace("{id}", confessionId);
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(confession.content)
    .setColor(0x9e3cff)
    .setTimestamp();

  const message = await targetChannel.send({ embeds: [embed] });

  try {
    const thread = await message.startThread({
      name: `Confession #${confessionId}`,
      autoArchiveDuration: 1440,
    });
    await thread.send({
      content: "Use the buttons below to reply anonymously or report this confession.",
      components: [buildThreadButtons(message.id)],
    });
  } catch (err) {
    console.error("[confessions] Failed to create thread on approve:", err);
  }

  return interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`✅ Confession #${confessionId} Approved`)
        .setDescription(confession.content),
    ],
    components: [],
  });
}

// ─── Decline button ────────────────────────────────────────────────────────────

async function handleDeclineButton(interaction) {
  const [, guildId, idStr] = interaction.customId.split(":");
  const confessionId = parseInt(idStr);

  const confession = await Confession.findOne({ guildId, confessionId });
  if (!confession || confession.status !== "pending") {
    return interaction.update({
      content: "This confession has already been processed.",
      components: [],
    });
  }

  confession.status = "declined";
  await confession.save();

  return interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`❌ Confession #${confessionId} Declined`)
        .setDescription(confession.content),
    ],
    components: [],
  });
}

// ─── Reply button → open modal ────────────────────────────────────────────────

async function handleReplyButton(interaction) {
  const parentMessageId = interaction.customId.split(":")[1];
  const modal = new ModalBuilder()
    .setCustomId(`confession_reply_submit:${parentMessageId}`)
    .setTitle("Anonymous Reply")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("replyText")
          .setLabel("Your anonymous reply")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
  return interaction.showModal(modal);
}

// ─── Reply modal submit ───────────────────────────────────────────────────────

async function handleReplySubmit(interaction) {
  const parentMessageId = interaction.customId.split(":")[1];
  const replyText = interaction.fields.getTextInputValue("replyText");

  const embed = new EmbedBuilder()
    .setTitle("Anonymous Reply")
    .setDescription(replyText)
    .setColor(0x7b4fc9)
    .setTimestamp();

  // Send the reply into the current thread with its own reply/report buttons
  const replyMessage = await interaction.channel.send({
    embeds: [embed],
    components: [buildThreadButtons(parentMessageId)],
  });

  // Update the button row that was clicked to remove its buttons so the thread
  // doesn't have stale buttons everywhere — just keep the newest set
  try {
    await interaction.message?.edit({ components: [] });
  } catch (_) {}

  // Put fresh buttons on the new reply message itself
  // (already done above via components in the send)

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x7b4fc9)
        .setTitle("Reply Sent")
        .setDescription("Your anonymous reply has been posted."),
    ],
    ephemeral: true,
  });
}

// ─── Report button → open modal ───────────────────────────────────────────────

async function handleReportButton(interaction) {
  const parentMessageId = interaction.customId.split(":")[1];
  const modal = new ModalBuilder()
    .setCustomId(`confession_report_submit:${parentMessageId}`)
    .setTitle("Report Confession / Reply")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reportReason")
          .setLabel("Reason for reporting")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
  return interaction.showModal(modal);
}

// ─── Report modal submit ──────────────────────────────────────────────────────

async function handleReportSubmit(interaction) {
  const parentMessageId = interaction.customId.split(":")[1];
  const reason = interaction.fields.getTextInputValue("reportReason");
  const guildId = interaction.guildId;

  const config = await ConfessionConfig.findOne({ guildId });

  const reportEmbed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Confession Report")
    .addFields(
      { name: "Thread", value: `<#${interaction.channel.id}>` },
      { name: "Reported Message ID", value: parentMessageId },
      { name: "Reason", value: reason },
    )
    .setTimestamp();

  let sent = false;

  // Try to post to a configured report channel
  if (config?.reportChannelId) {
    const reportChannel = await interaction.client.channels
      .fetch(config.reportChannelId)
      .catch(() => null);
    if (reportChannel) {
      await reportChannel.send({ embeds: [reportEmbed] });
      sent = true;
    }
  }

  // Fallback: DM the guild owner
  if (!sent) {
    try {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner();
      await owner.send({ embeds: [reportEmbed] });
    } catch (_) {}
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Report Submitted")
        .setDescription("Thank you. Your report has been sent to the moderators."),
    ],
    ephemeral: true,
  });
}

module.exports = {
  handleButton,
  handleModalSubmit,
  handleApproveButton,
  handleDeclineButton,
  handleReplyButton,
  handleReplySubmit,
  handleReportButton,
  handleReportSubmit,
};
