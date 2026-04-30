const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

async function handleEventSelect(interaction) {
  await interaction.deferUpdate();

  const selectedEvent = interaction.values[0];
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`selectLogChannel_${selectedEvent}`)
    .setPlaceholder("Select a channel")
    .setMinValues(1)
    .setMaxValues(1)
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.editReply({
    content: `Now choose the channel to log **${selectedEvent}** events:`,
    components: [row],
  });
}

async function handleChannelSelect(interaction) {
  await interaction.deferUpdate();

  const eventType = interaction.customId.replace("selectLogChannel_", "");
  const channelId = interaction.values[0];

  const config = await LogConfig.findOne({ guildId: interaction.guild.id });
  const currentChannelId = config?.logs?.[eventType];

  if (currentChannelId === channelId) {
    return interaction.editReply({
      content: `⚠️ Logging for **${eventType}** is already set to <#${channelId}>.`,
      components: [],
    });
  }

  await LogConfig.findOneAndUpdate(
    { guildId: interaction.guild.id },
    { $set: { [`logs.${eventType}`]: channelId } },
    { upsert: true },
  );

  await interaction.editReply({
    content: `✅ Logging for **${eventType}** set to <#${channelId}>.`,
    components: [],
  });
}

async function handleDisableSelect(interaction) {
  await interaction.deferUpdate();

  const eventType = interaction.values[0];

  await LogConfig.findOneAndUpdate(
    { guildId: interaction.guild.id },
    { $unset: { [`logs.${eventType}`]: "" } },
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Logging Disabled")
        .setDescription(`Logging for **${eventType}** has been **disabled**.`),
    ],
    components: [],
  });
}

module.exports = {
  handleEventSelect,
  handleChannelSelect,
  handleDisableSelect,
};
