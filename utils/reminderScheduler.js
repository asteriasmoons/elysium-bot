// utils/reminderScheduler.js
const Reminder = require("../models/Reminder");
const { EmbedBuilder } = require("discord.js");
const { DateTime } = require("luxon");

// Helper to parse intervals like "1h", "2d", "15m"
function parseInterval(str) {
  if (!str) return null;
  const m = str.match(/^(\d+)\s*([smhdw])$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000,
  };
  return num * (multipliers[unit] || 0);
}

module.exports = function startReminderScheduler(client) {
  console.log("[Reminders] Scheduler is running!");
  setInterval(async () => {
    const nowUTC = DateTime.utc();
    let reminders;
    try {
      reminders = await Reminder.find({});
    } catch (err) {
      console.error("[Reminders] DB error:", err);
      return;
    }

    for (const reminder of reminders) {
      // 1. Validate guild and channel still exist
      const guild = client.guilds.cache.get(reminder.guildId);
      if (!guild) continue;
      const channel = guild.channels.cache.get(reminder.channelId);
      if (!channel || !channel.isTextBased()) continue;

      // 2. Parse timezone (default to America/Chicago)
      const tz = reminder.timezone || "America/Chicago";

      // 3. Parse interval
      let intervalMs = parseInterval(reminder.interval);
      if (!intervalMs) continue;

      // 4. Parse startDate in UTC, but calculations in user’s timezone
      let startDateUtc;
      if (reminder.startDate instanceof Date) {
        startDateUtc = DateTime.fromJSDate(reminder.startDate, { zone: "utc" });
      } else if (typeof reminder.startDate === "string") {
        // stored as ISO string
        startDateUtc = DateTime.fromISO(reminder.startDate, { zone: "utc" });
      } else {
        startDateUtc = null;
      }
      if (!startDateUtc || !startDateUtc.isValid) {
        console.warn(
          `[Reminders] Invalid startDate for "${reminder.name}":`,
          reminder.startDate
        );
        continue;
      }

      // 5. Last sent calculation
      let lastSentUtc = reminder.lastSent
        ? DateTime.fromJSDate(reminder.lastSent, { zone: "utc" })
        : null;

      // Next send time in UTC
      let nextTimeUtc = startDateUtc;
      if (lastSentUtc) {
        nextTimeUtc = lastSentUtc.plus({ milliseconds: intervalMs });
      }

      // 6. Calculate "now" in the reminder’s timezone for day-of-week logic
      const nowInTz = nowUTC.setZone(tz);

      // 7. If a specific day of week is set, check if today matches in the user’s timezone
      if (reminder.dayOfWeek) {
        const today = nowInTz.toFormat("cccc"); // e.g. "Sunday"
        if (today.toLowerCase() !== reminder.dayOfWeek.toLowerCase()) continue;
      }

      // 8. Send if due
      if (nowUTC >= nextTimeUtc) {
        const embed = new EmbedBuilder()
          .setTitle(reminder.embedTitle || "Reminder!")
          .setDescription(reminder.embedDescription || "")
          .setColor(reminder.embedColor || "#8757f2");

        try {
          await channel.send({
            content: reminder.ping || "",
            embeds: [embed],
          });
          console.log(
            `[Reminders] Sent reminder "${reminder.name}" in #${channel.name} (TZ: ${tz})`
          );
        } catch (sendErr) {
          console.error(
            `[Reminders] Could not send reminder "${reminder.name}":`,
            sendErr
          );
          continue;
        }

        try {
          reminder.lastSent = nowUTC.toJSDate(); // Save as UTC!
          await reminder.save();
          console.log(`[Reminders] Updated lastSent for "${reminder.name}"`);
        } catch (saveErr) {
          console.error(
            `[Reminders] Could not update lastSent for "${reminder.name}":`,
            saveErr
          );
        }
      }
    }
  }, 60000); // every 60 seconds
};
