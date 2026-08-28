const { EmbedBuilder } = require("discord.js");
const GitHubFeed = require("../models/GitHubFeed");
const { getFeedDisplayName } = require("../utils/githubFeedUtils");

const GITHUB_COLOR = 0x8f72da;

function buildEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(GITHUB_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "GitHub Feed Tracker" });
}

async function handleUnwatchSelect(interaction) {
  const [, userId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    return interaction.reply({
      content: "Only the person who opened this menu can use it.",
      ephemeral: true,
    });
  }

  const feedId = interaction.values[0];
  const feed = await GitHubFeed.findOne({
    _id: feedId,
    guildId: interaction.guild.id,
  });

  if (!feed) {
    const embed = buildEmbed(
      "GitHub Feed Not Found",
      "That watched repository is already gone."
    );

    return interaction.update({
      embeds: [embed],
      components: [],
    });
  }

  const displayName = getFeedDisplayName(feed);
  const repoUrl = feed.repoUrl;
  await GitHubFeed.deleteOne({ _id: feed._id });

  const embed = buildEmbed(
    "GitHub Feed Removed",
    `No longer watching **${displayName}** ([${repoUrl}](${repoUrl})).`
  );

  await interaction.update({
    embeds: [embed],
    components: [],
  });
}

module.exports = {
  handleUnwatchSelect,
};
