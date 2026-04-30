const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

// Temporary in-memory store for pending event selections
// Key: `${guildId}:${userId}` — lives only as long as the bot process
const pendingLogSelections = new Map();

async function handleEventSelect(interaction) {
  await interaction.deferUpdate();

  const selectedEvents = interaction.values;
  const key = `${interaction.guild.id}:${interaction.user.id}`;

  // Store selected events against this user+guild
  pendingLogSelections.set(key, selectedEvents);

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("selectLogChannel")
    .setPlaceholder("Select a channel for all selected events")
    .setMinValues(1)
    .setMaxValues(1)
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  const eventList = selectedEvents.map((e) => `\`${e}\``).join(", ");

  await interaction.editReply({
    content: `Now choose the channel to log ${eventList} to:`,
    components: [row],
  });
}

async function handleChannelSelect(interaction) {
  await interaction.deferUpdate();

  const key = `${interaction.guild.id}:${interaction.user.id}`;
  const eventTypes = pendingLogSelections.get(key);

  if (!eventTypes || eventTypes.length === 0) {
    return interaction.editReply({
      content: "Something went wrong — please run `/log config` again.",
      components: [],
    });
  }

  pendingLogSelections.delete(key);

  const channelId = interaction.values[0];

  const setFields = {};
  for (const eventType of eventTypes) {
    setFields[`logs.${eventType}`] = channelId;
  }

  await LogConfig.findOneAndUpdate(
    { guildId: interaction.guild.id },
    { $set: setFields },
    { upsert: true },
  );

  const eventList = eventTypes.map((e) => `\`${e}\``).join(", ");

  await interaction.editReply({
    content: `✅ Logging for ${eventList} set to <#${channelId}>.`,
    components: [],
  });
}

async function handleDisableSelect(interaction) {
  await interaction.deferUpdate();

  const eventTypes = interaction.values;

  const unsetFields = {};
  for (const eventType of eventTypes) {
    unsetFields[`logs.${eventType}`] = "";
  }

  await LogConfig.findOneAndUpdate(
    { guildId: interaction.guild.id },
    { $unset: unsetFields },
  );

  const eventList = eventTypes.map((e) => `\`${e}\``).join(", ");

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Logging Disabled")
        .setDescription(`Logging for ${eventList} has been **disabled**.`),
    ],
    components: [],
  });
}

module.exports = { handleEventSelect, handleChannelSelect, handleDisableSelect };
