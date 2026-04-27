// commands/reminder.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Reminder = require("../models/Reminder");
const { DateTime } = require("luxon");
const { setupCache, getSetupUI } = require("../handlers/reminderHandler");

const tzExamples = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Tokyo",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription(
      "Create, list, edit, delete reminders or set server timezone"
    )
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new reminder")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("A unique name for this reminder")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all reminders in this server")
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit an existing reminder")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The name of the reminder to edit")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete a reminder")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("The name of the reminder to delete")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("timezone")
        .setDescription("Set the default timezone for reminders in this server")
        .addStringOption((opt) =>
          opt
            .setName("timezone")
            .setDescription(
              "IANA timezone (e.g., America/Chicago, Europe/London)"
            )
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    try {
      const sub = interaction.options.getSubcommand();
      const isDM = !interaction.guild;
      const userId = interaction.user.id;
      const guildId = isDM ? null : interaction.guild.id;
      const setupKey = isDM ? `dm_${userId}` : `${guildId}_${userId}`;

      // TIMEZONE — guild only
      if (sub === "timezone") {
        if (isDM) {
          return interaction.reply({
            content: "❌ Timezone configuration is only available in servers.",
            ephemeral: true,
          });
        }
        const tz = interaction.options.getString("timezone");
        if (!DateTime.local().setZone(tz).isValid) {
          return interaction.reply({
            content: `❌ Invalid timezone "${tz}". Try one of: ${tzExamples.join(
              ", "
            )}`,
            ephemeral: true,
          });
        }
        const result = await Reminder.updateMany({ guildId }, { timezone: tz });
        return interaction.reply({
          content: `✅ Default timezone for **${
            result.modifiedCount
          }** reminders set to **${tz}**.\n\nFor new reminders, this timezone will be shown in preview and used for start dates.\n\nExamples: ${tzExamples.join(
            ", "
          )}`,
          ephemeral: true,
        });
      }

      // CREATE
      if (sub === "create") {
        const name = interaction.options.getString("name").trim();
        console.log(
          `[Reminders] /reminder create invoked for ${name} by ${userId} ${
            isDM ? "in DM" : `in ${guildId}`
          }`
        );

        const query = isDM
          ? { type: "dm", userId, name }
          : { type: "guild", guildId, name };
        const exists = await Reminder.findOne(query);
        if (exists) {
          return interaction.reply({
            content: `❌ A reminder named **${name}** already exists.`,
            ephemeral: true,
          });
        }

        const existingForTz = isDM
          ? await Reminder.findOne({ type: "dm", userId })
          : await Reminder.findOne({ type: "guild", guildId });
        const defaultTimezone = existingForTz?.timezone || "America/Chicago";

        const setupObj = isDM
          ? {
              type: "dm",
              userId,
              guildId: null,
              creatorId: userId,
              name,
              interval: null,
              startDate: null,
              dayOfWeek: null,
              embedTitle: "Reminder!",
              embedDescription: "",
              embedColor: "#8757f2",
              timezone: defaultTimezone,
            }
          : {
              type: "guild",
              guildId,
              creatorId: userId,
              name,
              interval: null,
              startDate: null,
              ping: "",
              channelId: null,
              dayOfWeek: null,
              embedTitle: "Reminder!",
              embedDescription: "",
              embedColor: "#8757f2",
              timezone: defaultTimezone,
            };

        setupCache.set(setupKey, setupObj);
        return interaction.reply(getSetupUI(setupObj));
      }

      // LIST
      if (sub === "list") {
        const query = isDM
          ? { type: "dm", userId }
          : { type: "guild", guildId };
        const reminders = await Reminder.find(query);
        if (!reminders.length)
          return interaction.reply({
            content: isDM
              ? "You have no DM reminders set."
              : "No reminders set in this server.",
            ephemeral: true,
          });
        const embed = new EmbedBuilder()
          .setTitle("Reminders")
          .setColor(0x8757f2)
          .setDescription(
            reminders
              .map((r) =>
                isDM
                  ? `**${r.name}** — Every \`${r.interval}\` | TZ: \`${r.timezone}\``
                  : `**${r.name}** — Every \`${r.interval}\` in <#${r.channelId}> ${r.embedTitle} | TZ: \`${r.timezone}\``
              )
              .join("\n")
          );
        return interaction.reply({ embeds: [embed], ephemeral: false });
      }

      // EDIT
      if (sub === "edit") {
        const name = interaction.options.getString("name").trim();
        const query = isDM
          ? { type: "dm", userId, name }
          : { type: "guild", guildId, name };
        const reminder = await Reminder.findOne(query);
        if (!reminder)
          return interaction.reply({
            content: `No reminder named **${name}** was found.`,
            ephemeral: true,
          });

        const setupObj = { ...reminder.toObject() };
        setupCache.set(setupKey, setupObj);
        return interaction.reply(getSetupUI(setupObj));
      }

      // DELETE
      if (sub === "delete") {
        const name = interaction.options.getString("name").trim();
        const query = isDM
          ? { type: "dm", userId, name }
          : { type: "guild", guildId, name };
        const reminder = await Reminder.findOne(query);
        if (!reminder)
          return interaction.reply({
            content: `❌ No reminder named **${name}** was found.`,
            ephemeral: true,
          });

        await reminder.deleteOne();
        return interaction.reply({
          content: `✅ Reminder **${name}** deleted.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error("[Reminders] Slash command error:", err);
      try {
        await interaction.reply({
          content: "Something went wrong while handling the reminder command.",
          ephemeral: true,
        });
      } catch {}
    }
  },

};
