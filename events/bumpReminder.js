const { EmbedBuilder } = require("discord.js");
const BumpReminder = require("../models/BumpReminder");

module.exports = (client) => {
  setInterval(async () => {
    const reminders = await BumpReminder.find();

    reminders.forEach(async (reminder) => {
      // Skip if bump reminders are disabled for this server
      if (reminder.reminderDisabled) return;

      // Only proceed if there is a last bump and reminder hasn't been sent yet
      if (!reminder.lastBump) return;
      if (reminder.reminderSent) return;

      const now = Date.now();
      const nextBump = new Date(reminder.lastBump).getTime() + 7200000; // 2 hours

      if (now >= nextBump) {
        const guild = await client.guilds
          .fetch(reminder.guildId)
          .catch(() => null);
        if (!guild) return;

        const channel = guild.channels.cache.get(reminder.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setTitle(reminder.reminderTitle)
          .setDescription(reminder.reminderDesc)
          .setColor(0x72bdda)
          .setTimestamp();

        // Prepare role ping content if pingRoleId is set
        let content = "";
        if (reminder.pingRoleId) {
          content = `<@&${reminder.pingRoleId}>`;
        }

        await channel.send({
          content: content || undefined, // ping the role if present
          embeds: [embed],
        });

        // Mark the reminder as sent so it won't repeat until the next bump
        reminder.reminderSent = true;
        await reminder.save();
      }
    });
  }, 60 * 1000); // check every minute
};
