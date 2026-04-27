// handlers/reminderHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Reminder = require("../models/Reminder");
const chrono = require("chrono-node");
const { DateTime } = require("luxon");

const tzExamples = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Tokyo",
];

const setupCache = new Map();

function getSetupUI(data) {
  const previewEmbed = new EmbedBuilder()
    .setTitle(data.embedTitle || "Reminder Preview")
    .setDescription(data.embedDescription || "No description set.")
    .setColor(data.embedColor || "#8757f2")
    .addFields(
      {
        name: "Interval",
        value: data.interval ? `\`${data.interval}\`` : "`Not set`",
        inline: true,
      },
      {
        name: "Start Date",
        value: data.startDate
          ? `<t:${Math.floor(new Date(data.startDate).getTime() / 1000)}:f>`
          : "`Not set`",
        inline: true,
      },
      { name: "Ping", value: data.ping || "`None`", inline: true },
      {
        name: "Channel",
        value: data.channelId ? `<#${data.channelId}>` : "`Not set`",
        inline: true,
      },
      {
        name: "Day of Week",
        value: data.dayOfWeek || "`Every day`",
        inline: true,
      },
      {
        name: "Timezone",
        value: data.timezone || "`America/Chicago`",
        inline: true,
      }
    );

  const settingsMenu = new StringSelectMenuBuilder()
    .setCustomId("reminder-settings")
    .setPlaceholder("Select a setting to configure...")
    .addOptions([
      {
        label: "Reminder Interval",
        value: "interval",
        description: "How often to repeat? (e.g. 1h, 1d)",
      },
      {
        label: "Start Date",
        value: "startDate",
        description: "When to start the reminder?",
      },
      {
        label: "Ping (Role/User)",
        value: "ping",
        description: "Who should be pinged?",
      },
      {
        label: "Channel",
        value: "channel",
        description: "Which channel to send to?",
      },
      {
        label: "Send on Specific Day",
        value: "dayOfWeek",
        description: "Which day? (optional)",
      },
      {
        label: "Timezone",
        value: "timezone",
        description: "What timezone to use?",
      },
    ]);

  const messageMenu = new StringSelectMenuBuilder()
    .setCustomId("reminder-message")
    .setPlaceholder("Customize reminder message...")
    .addOptions([
      {
        label: "Embed Title",
        value: "embedTitle",
        description: "Change the embed title",
      },
      {
        label: "Embed Description",
        value: "embedDescription",
        description: "Change the embed description",
      },
      {
        label: "Embed Color",
        value: "embedColor",
        description: "Change the embed color (hex)",
      },
    ]);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reminder-save")
      .setLabel("Save")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("reminder-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [previewEmbed],
    components: [
      new ActionRowBuilder().addComponents(settingsMenu),
      new ActionRowBuilder().addComponents(messageMenu),
      buttons,
    ],
  };
}

async function handleComponent(interaction, client) {
  try {
    const isDM = !interaction.guild && !interaction.guildId;
    const guildId = interaction.guildId || interaction.guild?.id || null;
    const userId = interaction.user.id;
    const setupKey = isDM ? `dm_${userId}` : `${guildId}_${userId}`;
    const setupObj = setupCache.get(setupKey);

    if (!setupObj) {
      return interaction.reply({
        content:
          "Setup session expired or not found. Please run `/reminder create` again.",
        ephemeral: true,
      });
    }

    // SELECT MENU HANDLING
    if (interaction.isStringSelectMenu()) {
      const selected = interaction.values[0];
      let prompt = "";

      if (interaction.customId === "reminder-settings") {
        if (selected === "interval")
          prompt =
            "How often should this reminder repeat? (e.g. `1h`, `1d`, `12h`)";
        if (selected === "startDate")
          prompt = `When should the first reminder start? (Try things like \`tomorrow 9am\`, \`in 3 hours\`, \`2025-07-01 10:00\`, or \`now\`)\nTimezone: \`${setupObj.timezone}\``;
        if (selected === "ping")
          prompt =
            "Who should be pinged? (mention a user, a role, or type text. Leave blank for none)";
        if (selected === "channel")
          prompt =
            "Which channel should the reminder be sent to? (mention the channel or paste its ID)";
        if (selected === "dayOfWeek")
          prompt =
            "On which day of the week should this reminder be sent? (e.g. `Monday`. Leave blank for every day)";
        if (selected === "timezone")
          prompt = `What timezone should this reminder use? (IANA string, e.g., America/Chicago)\nExamples: ${tzExamples.join(
            ", "
          )}`;
      }
      if (interaction.customId === "reminder-message") {
        if (selected === "embedTitle")
          prompt = "What should the embed title be?";
        if (selected === "embedDescription")
          prompt = "What should the embed description be?";
        if (selected === "embedColor")
          prompt =
            "What color should the embed be? (hex code, e.g. `#ffcc00`)";
      }

      await interaction.reply({ content: prompt, ephemeral: !isDM });

      const dmChannel = isDM
        ? await client.users.fetch(userId).then((u) => u.createDM())
        : null;
      const collectorChannel = dmChannel ?? interaction.channel;
      const collector = collectorChannel.createMessageCollector({
        filter: (m) => m.author.id === interaction.user.id,
        max: 1,
        time: 60000,
      });

      collector.on("collect", async (m) => {
        const value = m.content.trim();
        if (interaction.customId === "reminder-settings") {
          if (selected === "interval") setupObj.interval = value;
          if (selected === "startDate") {
            let parsed;
            if (value.toLowerCase() === "now") {
              parsed = DateTime.now().setZone(setupObj.timezone).toJSDate();
            } else {
              let tempParsed = chrono.parseDate(value, new Date(), {
                timezone: setupObj.timezone,
              });
              if (!tempParsed) {
                await interaction.followUp({
                  content: `⚠️ Sorry, I couldn't understand that date/time! Example: \`tomorrow 5pm\`, \`in 2 hours\`, \`2025-07-01 10:00\` (Timezone: \`${setupObj.timezone}\`)`,
                  ephemeral: true,
                });
                return;
              }
              parsed = DateTime.fromJSDate(tempParsed)
                .setZone(setupObj.timezone)
                .toUTC()
                .toJSDate();
            }
            setupObj.startDate = parsed;
            console.log(
              `[Reminders] Start date set to: ${parsed.toISOString()} (TZ: ${setupObj.timezone})`
            );
          }
          if (selected === "ping") setupObj.ping = value;
          if (selected === "channel") {
            let channelId = value;
            const channelMention = value.match(/^<#(\d+)>$/);
            if (channelMention) channelId = channelMention[1];
            setupObj.channelId = channelId;
          }
          if (selected === "dayOfWeek") setupObj.dayOfWeek = value || null;
          if (selected === "timezone") {
            if (!DateTime.local().setZone(value).isValid) {
              await interaction.followUp({
                content: `❌ Invalid timezone "${value}". Try one of: ${tzExamples.join(
                  ", "
                )}`,
                ephemeral: true,
              });
              return;
            }
            setupObj.timezone = value;
          }
        } else if (interaction.customId === "reminder-message") {
          if (selected === "embedTitle") setupObj.embedTitle = value;
          if (selected === "embedDescription") setupObj.embedDescription = value;
          if (selected === "embedColor")
            setupObj.embedColor = value.startsWith("#") ? value : `#${value}`;
        }

        setupCache.set(setupKey, setupObj);
        if (!isDM) await m.delete().catch(() => {});
        await interaction.followUp(getSetupUI(setupObj));
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time")
          interaction.followUp({
            content:
              "⏰ Setup timed out. Please use `/reminder edit` to continue.",
            ephemeral: true,
          });
      });

      return;
    }

    // BUTTON HANDLING
    if (interaction.isButton()) {
      if (!["reminder-save", "reminder-cancel"].includes(interaction.customId))
        return;

      if (interaction.customId === "reminder-cancel") {
        setupCache.delete(setupKey);
        return interaction.reply({
          content: "❌ Reminder setup canceled.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "reminder-save") {
        const needsChannel = setupObj.type !== "dm";
        if (!setupObj.interval || !setupObj.startDate || (needsChannel && !setupObj.channelId)) {
          return interaction.reply({
            content: needsChannel
              ? "Please set the interval, start date, and channel before saving!"
              : "Please set the interval and start date before saving!",
            ephemeral: true,
          });
        }
        if (typeof setupObj.startDate === "string")
          setupObj.startDate = new Date(setupObj.startDate);

        const upsertQuery = setupObj.type === "dm"
          ? { type: "dm", userId: setupObj.userId, name: setupObj.name }
          : { type: "guild", guildId: setupObj.guildId, name: setupObj.name };

        await Reminder.findOneAndUpdate(
          upsertQuery,
          setupObj,
          { upsert: true, new: true }
        );
        setupCache.delete(setupKey);
        return interaction.reply({
          content: `✅ Reminder **${setupObj.name}** saved!`,
          ephemeral: true,
        });
      }
    }
  } catch (err) {
    console.error("[Reminders] Component handler error:", err);
    try {
      await interaction.reply({
        content: "Something went wrong while handling the reminder setup.",
        ephemeral: true,
      });
    } catch {}
  }
}

module.exports = { setupCache, getSetupUI, handleComponent };
