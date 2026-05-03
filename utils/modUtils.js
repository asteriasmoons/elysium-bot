const { EmbedBuilder } = require("discord.js");
const ModerationCase = require("../models/ModerationCase");
const ModerationConfig = require("../models/ModerationConfig");

const TYPE_COLORS = {
  ban: 0xed4245,
  unban: 0x57f287,
  kick: 0xfee75c,
  timeout: 0xffa500,
  untimeout: 0x57f287,
  warn: 0xffa500,
  note: 0x5865f2,
};

const TYPE_LABELS = {
  ban: "Ban",
  unban: "Unban",
  kick: "Kick",
  timeout: "Timeout",
  untimeout: "Untimeout",
  warn: "Warn",
  note: "Note",
};

async function getNextCaseId(guildId) {
  const last = await ModerationCase.findOne({ guildId })
    .sort({ caseId: -1 })
    .select("caseId")
    .lean();
  return last ? last.caseId + 1 : 1;
}

function formatDuration(ms) {
  if (!ms) return null;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

async function dmTarget(client, userId, guildName, type, reason, caseId, duration) {
  try {
    const user = await client.users.fetch(userId);
    const durationStr = formatDuration(duration);
    const embed = new EmbedBuilder()
      .setColor(TYPE_COLORS[type] || 0x5865f2)
      .setTitle(`${TYPE_LABELS[type]} — ${guildName}`)
      .addFields(
        { name: "Case", value: `#${caseId}`, inline: true },
        ...(durationStr ? [{ name: "Duration", value: durationStr, inline: true }] : []),
        { name: "Reason", value: reason || "No reason provided" },
      )
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (_) {}
}

async function postModLog(client, guildId, caseDoc, targetTag, moderatorTag) {
  try {
    const config = await ModerationConfig.findOne({ guildId });
    if (!config?.modLogChannelId) return;
    const channel = await client.channels.fetch(config.modLogChannelId).catch(() => null);
    if (!channel) return;
    const durationStr = formatDuration(caseDoc.duration);
    const embed = new EmbedBuilder()
      .setColor(TYPE_COLORS[caseDoc.type] || 0x5865f2)
      .setTitle(`${TYPE_LABELS[caseDoc.type]} | Case #${caseDoc.caseId}`)
      .addFields(
        { name: "User", value: `${targetTag} (<@${caseDoc.userId}>)`, inline: true },
        { name: "Moderator", value: `${moderatorTag} (<@${caseDoc.moderatorId}>)`, inline: true },
        ...(durationStr ? [{ name: "Duration", value: durationStr, inline: true }] : []),
        { name: "Reason", value: caseDoc.reason || "No reason provided" },
      )
      .setFooter({ text: `User ID: ${caseDoc.userId}` })
      .setTimestamp(caseDoc.createdAt);
    await channel.send({ embeds: [embed] });
  } catch (_) {}
}

async function createCase(client, {
  guildId, userId, moderatorId, type, reason,
  duration = null, targetTag, moderatorTag, guildName, dmUser = true,
}) {
  const caseId = await getNextCaseId(guildId);
  const expiresAt = duration ? new Date(Date.now() + duration) : null;

  const caseDoc = await ModerationCase.create({
    guildId, caseId, userId, moderatorId, type,
    reason, duration, expiresAt, active: true,
  });

  if (dmUser && type !== "note") {
    await dmTarget(client, userId, guildName, type, reason, caseId, duration);
  }

  await postModLog(client, guildId, caseDoc, targetTag, moderatorTag);
  return caseDoc;
}

async function checkWarnEscalation(client, guild, userId, moderatorId, moderatorTag) {
  const config = await ModerationConfig.findOne({ guildId: guild.id });
  if (!config?.warnThresholds?.length) return;

  const activeWarns = await ModerationCase.countDocuments({
    guildId: guild.id, userId, type: "warn", active: true,
  });

  const thresholds = [...config.warnThresholds].sort((a, b) => b.count - a.count);
  const hit = thresholds.find((t) => activeWarns >= t.count);
  if (!hit) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const reason = `Automatic escalation: ${activeWarns} active warnings`;
  const targetTag = member.user.tag;

  try {
    if (hit.action === "timeout" && hit.duration) {
      await member.timeout(hit.duration, reason);
      await createCase(client, {
        guildId: guild.id, userId, moderatorId, type: "timeout",
        reason, duration: hit.duration, targetTag, moderatorTag, guildName: guild.name,
      });
    } else if (hit.action === "ban") {
      await guild.members.ban(userId, { reason });
      await createCase(client, {
        guildId: guild.id, userId, moderatorId, type: "ban",
        reason, targetTag, moderatorTag, guildName: guild.name,
      });
    }
  } catch (_) {}
}

module.exports = { createCase, checkWarnEscalation, formatDuration, TYPE_COLORS, TYPE_LABELS };
