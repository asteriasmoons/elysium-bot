const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

async function handleEventSelect(interaction) {
  await interaction.deferUpdate();

  const selectedEvents = interaction.values;

  // Encode selected events into the customId so we have them when the channel is picked
  const encoded = selectedEvents.join(",");

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`selectLogChannel_${encoded}`)
    .setPlaceholder("Select a channel for all selected events")
    .setMinValues(1)
    .setMaxValues(1)
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  const eventList = selectedEvents
    .map((e) => `\`${e}\``)
    .join(", ");

  await interaction.editReply({
    content: `Now choose the channel to log ${eventList} events:`,
    components: [row],
  });
}

async function handleChannelSelect(interaction) {
  await interaction.deferUpdate();

  const encoded = interaction.customId.replace("selectLogChannel_", "");
  const eventTypes = encoded.split(",");
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

  const eventList = eventTypes
    .map((e) => `\`${e}\``)
    .join(", ");

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

  const eventList = eventTypes
    .map((e) => `\`${e}\``)
    .join(", ");

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
