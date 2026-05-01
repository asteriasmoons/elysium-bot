const { EmbedBuilder } = require("discord.js");
const AutoThreadConfig = require("../models/AutoThreadConfig");

async function handleChannelSelect(interaction) {
  const selectedChannelIds = interaction.values;

  let config = await AutoThreadConfig.findOne({
    guildId: interaction.guild.id,
  });
  if (!config) {
    config = await AutoThreadConfig.create({
      guildId: interaction.guild.id,
      channels: [],
      archivedChannels: [],
    });
  }

  // Archive configs for channels being removed
  const removedChannels = config.channels.filter(
    (c) => !selectedChannelIds.includes(c.channelId),
  );
  if (!config.archivedChannels) config.archivedChannels = [];
  for (const removed of removedChannels) {
    if (
      !config.archivedChannels.some((a) => a.channelId === removed.channelId)
    ) {
      config.archivedChannels.push(removed);
    }
  }

  // Build new channels array, restoring archived settings if re-added
  const newChannels = [];
  for (const id of selectedChannelIds) {
    let found = config.channels.find((c) => c.channelId === id);
    if (!found) found = config.archivedChannels.find((c) => c.channelId === id);
    newChannels.push(
      found || {
        channelId: id,
        embed: {},
        threadNameTemplate: "Thread for {user}",
      },
    );
  }

  config.channels = newChannels;
  config.archivedChannels = config.archivedChannels.filter(
    (c) => !selectedChannelIds.includes(c.channelId),
  );

  await config.save();

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("Auto-Thread Channels Updated")
        .setDescription(
          `Auto-threading enabled for:\n${selectedChannelIds.map((id) => `<#${id}>`).join(", ")}\n\n**Tip:** Re-adding a channel restores your previous embed and thread name settings.`,
        )
        .setColor("#43B581"),
    ],
    components: [],
  });
}

module.exports = { handleChannelSelect };
