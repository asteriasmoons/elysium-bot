const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { DateTime } = require("luxon");
const Reminder = require("../models/Reminder");
const ReminderConfig = require("../models/ReminderConfig");

const scheduled = {}; // In-memory store for active timeouts (clears on bot restart)

// --- Helper Functions for Channels ---

async function getReminderChannels(guildId) {
  if (!guildId) return [];
  try {
    const config = await ReminderConfig.findOne({ guildId });
    return config ? config.channelIds : [];
  } catch (error) {
    console.error(
      `[Error] Failed to get reminder channels for guild ${guildId}:`,
      error
    );
    return [];
  }
}

async function addReminderChannel(guildId, channelId) {
  if (!guildId || !channelId) return;
  try {
    await ReminderConfig.findOneAndUpdate(
      { guildId },
      { $addToSet: { channelIds: channelId } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(
      `[Error] Failed to add reminder channel ${channelId} for guild ${guildId}:`,
      error
    );
  }
}

async function removeReminderChannel(guildId, channelId) {
  if (!guildId || !channelId) return;
  try {
    await ReminderConfig.findOneAndUpdate(
      { guildId },
      { $pull: { channelIds: channelId } }
    );
  } catch (error) {
    console.error(
      `[Error] Failed to remove reminder channel ${channelId} for guild ${guildId}:`,
      error
    );
  }
}

// --- SCHEDULE HELPERS (Modified) ---

async function getUserReminders(userId, guildId) {
  try {
    if (guildId) {
      // Fetching reminders for a specific guild
      return await Reminder.find({ userId: userId, guildId: guildId });
    } else {
      // Fetching DM reminders (guildId is null or undefined)
      return await Reminder.find({ userId: userId, guildId: null });
    }
  } catch (error) {
    console.error(
      `[Error] Failed to get reminders for userId ${userId} (guildId: ${
        guildId || "DM"
      }):`,
      error
    );
    return [];
  }
}

async function scheduleAllReminders(client) {
  try {
    const reminders = await Reminder.find({});
    for (const reminder of reminders) {
      scheduleReminder(client, reminder);
    }
  } catch (error) {
    console.error("[Error] Critical error in scheduleAllReminders:", error);
  }
}

function scheduleReminder(client, reminder) {
  if (!reminder || !reminder._id) {
    console.error(
      "[SCHEDULE ABORT] Invalid reminder object passed to scheduleReminder:",
      reminder
    );
    return;
  }
  if (reminder._timeout) {
    clearTimeout(reminder._timeout);
  }

  try {
    const now = DateTime.now().setZone(reminder.zone || "America/Chicago");
    let next = now.set({
      hour: reminder.hour,
      minute: reminder.minute,
      second: 0,
      millisecond: 0,
    });

    if (next <= now) {
      next = next.plus({ days: 1 });
    }

    const msUntil = next.diff(now).as("milliseconds");

    reminder._timeout = setTimeout(async () => {
      try {
        const currentReminderState = await Reminder.findById(reminder._id);
        if (!currentReminderState) {
          return;
        }
        const activeReminder = currentReminderState;

        // Prevent sending more than once per day
        const now = DateTime.now().setZone(
          activeReminder.zone || "America/Chicago"
        );
        const lastSent = activeReminder.reminderSentAt
          ? DateTime.fromJSDate(activeReminder.reminderSentAt).setZone(
              activeReminder.zone
            )
          : null;

        if (lastSent && lastSent.hasSame(now, "day")) {
          scheduleReminder(client, activeReminder);
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x993377)
          .setTitle("Reminder!")
          .setDescription(
            activeReminder.text ? activeReminder.text : "This is your reminder!"
          );

        let sent = false;
        if (activeReminder.guildId) {
          const channelIds = await getReminderChannels(activeReminder.guildId);
          if (!channelIds || !channelIds.length) {
            // No channels configured
          } else {
            for (const channelId of channelIds) {
              try {
                const channel = await client.channels.fetch(channelId);
                if (channel && channel.isTextBased()) {
                  const permissions = channel.permissionsFor(client.user);
                  if (!permissions || !permissions.has("SendMessages"))
                    continue;
                  if (!permissions.has("EmbedLinks")) continue;
                  await channel.send({
                    content: `<@${activeReminder.userId}>`,
                    embeds: [embed],
                  });
                  sent = true;
                }
              } catch (e) {
                // channel send error
              }
            }
          }
        } else {
          // DM reminder
          try {
            const user = await client.users.fetch(activeReminder.userId);
            const dmChannel = await user.createDM();
            await dmChannel.send({ embeds: [embed] });
            sent = true;
          } catch (dmError) {
            // DM send error
          }
        }

        // Mark as sent after successful send
        if (sent) {
          activeReminder.reminderSentAt = new Date();
          await activeReminder.save();
        }

        scheduleReminder(client, activeReminder);
      } catch (err) {
        const stillExists = await Reminder.findById(reminder._id);
        if (stillExists) {
          scheduleReminder(client, stillExists);
        }
      }
    }, msUntil);

    scheduled[reminder.userId] = scheduled[reminder.userId] || [];
    if (reminder._timeout) {
      scheduled[reminder.userId].push(reminder._timeout);
    }
  } catch (error) {
    console.error(
      `[SCHEDULE ERROR] Failed to schedule reminder for ID ${reminder?._id} (User: ${reminder?.userId}):`,
      error
    );
  }
}

// COMMAND MODULE
module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminders")
    .setDescription("Manage your daily reminders")
    // --- SET ---
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription(
          "Set a daily reminder (uses your current timezone setting)"
        )
        .addIntegerOption((option) =>
          option
            .setName("hour")
            .setDescription("Hour (0-23, 24-hour format)")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("minute")
            .setDescription("Minute (0-59)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("Reminder message (optional)")
            .setRequired(false)
        )
    )
    // --- REMOVE ---
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a reminder by its number from the list")
        .addIntegerOption((option) =>
          option
            .setName("index")
            .setDescription(
              "Reminder number (from /reminders list in this context)"
            )
            .setRequired(true)
        )
    )
    // --- LIST ---
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List all your reminders (for this server or DMs)")
    )
    // --- TIMEZONE ---
    .addSubcommand((sub) =>
      sub
        .setName("timezone")
        .setDescription(
          "Set your timezone for all your reminders in the current context (server/DM)"
        )
        .addStringOption((option) =>
          option
            .setName("zone")
            .setDescription(
              "IANA timezone (e.g., America/New_York, Europe/London)"
            )
            .setRequired(true)
        )
    )
    // --- MESSAGE ---
    .addSubcommand((sub) =>
      sub
        .setName("message")
        .setDescription("Update the message for one of your reminders")
        .addIntegerOption((option) =>
          option
            .setName("index")
            .setDescription(
              "Reminder number (from /reminders list in this context)"
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The new reminder message")
            .setRequired(true)
        )
    )
    // --- RESCHEDULE ---
    .addSubcommand((sub) =>
      sub
        .setName("reschedule")
        .setDescription("Change the time of a specific reminder")
        .addIntegerOption((option) =>
          option
            .setName("index")
            .setDescription(
              "Reminder number (from /reminders list in this context)"
            )
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("hour")
            .setDescription("New hour (0-23, 24-hour format)")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("minute")
            .setDescription("New minute (0-59)")
            .setRequired(true)
        )
    )
    // --- CHANNEL ---
    .addSubcommandGroup((group) =>
      group
        .setName("channel")
        .setDescription("Manage reminder channels for this server")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription(
              "Add a channel for this server to receive reminders"
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to add")
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription(
              "Remove a channel for this server from receiving reminders"
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to remove")
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription(
              "List all channels configured for reminders in this server"
            )
        )
    ),

  async execute(interaction) {
    const client = interaction.client;
    const userId = interaction.user.id;
    // guildId will be null if the command is used in DMs
    const guildId = interaction.guild ? interaction.guild.id : null;

    // --- CHANNEL Subcommand Group Logic ---
    if (interaction.options.getSubcommandGroup(false) === "channel") {
      if (!guildId) {
        return interaction.reply({
          content: "Channel commands can only be used in a server.",
          ephemeral: false,
        });
      }
      const sub = interaction.options.getSubcommand();
      const channelOpt = interaction.options.getChannel("channel"); // Used by add/remove

      if (sub === "add") {
        await addReminderChannel(guildId, channelOpt.id);
        await interaction.reply({
          content: `Added <#${channelOpt.id}> as a reminder channel for this server!`,
          ephemeral: false,
        });
      } else if (sub === "remove") {
        await removeReminderChannel(guildId, channelOpt.id);
        await interaction.reply({
          content: `Removed <#${channelOpt.id}> from reminder channels for this server!`,
          ephemeral: false,
        });
      } else if (sub === "list") {
        const channelIds = await getReminderChannels(guildId);
        if (!channelIds || !channelIds.length) {
          // Added !channelIds check
          return interaction.reply({
            content: "No reminder channels set for this server.",
            ephemeral: false,
          });
        }
        const names = channelIds.map((id) => `<#${id}>`).join("\n") || "None";
        await interaction.reply({
          content: `Reminder channels for this server:\n${names}`,
          ephemeral: false,
        });
      }
      return; // Exit after handling channel commands
    }

    // --- Other Subcommands Logic ---
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const hour = interaction.options.getInteger("hour");
      const minute = interaction.options.getInteger("minute");
      const text =
        interaction.options.getString("text") || "This is your reminder!";

      let zone = "America/Chicago"; // Default zone
      // Attempt to get user's zone from an existing reminder in the current context (guild or DM)
      // This means their first reminder in any context will use default, subsequent ones will use the zone of the first.
      // Or, they should use /reminders timezone first.
      const existingRemindersInContext = await getUserReminders(
        userId,
        guildId
      );
      if (
        existingRemindersInContext.length > 0 &&
        existingRemindersInContext[0].zone
      ) {
        zone = existingRemindersInContext[0].zone;
      } else if (!guildId) {
        // If in DM and no existing DM reminders, perhaps fetch any reminder to get a zone?
        const anyUserReminder = await Reminder.findOne({ userId }); // Find any reminder by user to get a zone
        if (anyUserReminder && anyUserReminder.zone)
          zone = anyUserReminder.zone;
      }

      const newReminder = await Reminder.create({
        userId,
        guildId,
        hour,
        minute,
        text,
        zone,
      });
      scheduleReminder(client, newReminder);

      const embed = new EmbedBuilder()
        .setColor(0x993377)
        .setTitle("Reminder Set!")
        .setDescription(
          `Your reminder is set for **${hour
            .toString()
            .padStart(2, "0")}:${minute
            .toString()
            .padStart(
              2,
              "0"
            )}** (Timezone: ${zone}).\nMessage: "${text}"\nContext: ${
            guildId ? "This Server" : "DMs"
          }`
        );
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (sub === "list") {
      let userReminders = await getUserReminders(userId, guildId);
      const location = guildId ? `in ${interaction.guild.name}` : "in your DMs";
      const title = guildId
        ? `Your Reminders in ${interaction.guild.name}`
        : "Your Personal DM Reminders";

      if (!userReminders.length) {
        await interaction.reply({
          content: `You have no reminders set ${location}.`,
          ephemeral: false,
        });
        return;
      }

      const embed = new EmbedBuilder().setColor(0x993377).setTitle(title);
      userReminders.forEach((r, i) => {
        embed.addFields({
          name: `#${i + 1}: ${r.hour.toString().padStart(2, "0")}:${r.minute
            .toString()
            .padStart(2, "0")} (Zone: ${r.zone || "Not Set"})`,
          value:
            r.text.substring(0, 1020) + (r.text.length > 1020 ? "..." : ""), // Ensure value is not too long
        });
      });
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (sub === "remove" || sub === "message" || sub === "reschedule") {
      const index = interaction.options.getInteger("index") - 1;
      let userRemindersInContext = await getUserReminders(userId, guildId); // Fetches based on current context

      if (
        index < 0 ||
        index >= userRemindersInContext.length ||
        !userRemindersInContext[index]
      ) {
        const location = guildId ? "for this server" : "for your DMs";
        await interaction.reply({
          content: `Invalid reminder number ${location}. Use \`/reminders list\` to see correct numbers.`,
          ephemeral: false,
        });
        return;
      }
      const reminderToModify = userRemindersInContext[index];

      if (sub === "remove") {
        if (reminderToModify._timeout) clearTimeout(reminderToModify._timeout);
        await Reminder.deleteOne({ _id: reminderToModify._id });
        await interaction.reply({
          content: `Reminder #${index + 1} ("${reminderToModify.text.substring(
            0,
            50
          )}") has been removed.`,
          ephemeral: false,
        });
      } else if (sub === "message") {
        const newText = interaction.options.getString("text");
        reminderToModify.text = newText;
        await reminderToModify.save();
        scheduleReminder(client, reminderToModify);
        await interaction.reply({
          content: `Reminder #${index + 1} message updated to "${newText}".`,
          ephemeral: false,
        });
      } else if (sub === "reschedule") {
        const newHour = interaction.options.getInteger("hour");
        const newMinute = interaction.options.getInteger("minute");
        reminderToModify.hour = newHour;
        reminderToModify.minute = newMinute;
        await reminderToModify.save();
        scheduleReminder(client, reminderToModify);
        await interaction.reply({
          content: `Reminder #${index + 1} rescheduled to ${String(
            newHour
          ).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}.`,
          ephemeral: false,
        });
      }
    } else if (sub === "timezone") {
      const newZone = interaction.options.getString("zone");
      try {
        DateTime.now().setZone(newZone);
      } catch (e) {
        await interaction.reply({
          content:
            "Invalid timezone. Please use a valid IANA timezone string (e.g., America/New_York, Europe/London).",
          ephemeral: false,
        });
        return;
      }

      let remindersToUpdate = await getUserReminders(userId, guildId);
      if (!remindersToUpdate.length) {
        const location = guildId ? "in this server" : "for your DMs";
        return interaction.reply({
          content: `You have no reminders set ${location} to update the timezone for.`,
          ephemeral: false,
        });
      }

      for (const r of remindersToUpdate) {
        r.zone = newZone;
        await r.save();
        scheduleReminder(client, r);
      }
      const contextMessage = guildId
        ? "for this server's reminders"
        : "for your DM reminders";
      await interaction.reply({
        content: `Timezone set to **${newZone}** ${contextMessage}. Existing reminders in this context have been updated and rescheduled.`,
        ephemeral: false,
      });
    }
  },

  async init(client) {
    await scheduleAllReminders(client);
  },
};
