const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const GitHubFeed = require("../models/GitHubFeed");
const {
  getFeedDisplayName,
  getGitHubHeaders,
  getRepoPartsFromFeed,
  makeNameKey,
  parseGitHubRepo,
} = require("../utils/githubFeedUtils");
const axios = require("axios");

const GITHUB_COLOR = 0x8f72da;

async function getWatchedFeeds(guildId) {
  return GitHubFeed.find({ guildId }).sort({ displayName: 1, repoUrl: 1 });
}

async function findNameConflict(guildId, displayName, ignoreId = null) {
  const nameKey = makeNameKey(displayName);
  if (!nameKey) return null;

  const feeds = await getWatchedFeeds(guildId);
  return feeds.find((feed) => {
    if (ignoreId && String(feed._id) === String(ignoreId)) return false;
    return makeNameKey(getFeedDisplayName(feed)) === nameKey;
  });
}

async function findFeedByIdentifier(guildId, identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;

  const parsedRepo = parseGitHubRepo(value);
  if (parsedRepo) {
    const feed = await GitHubFeed.findOne({
      guildId,
      repoUrl: parsedRepo.repoUrl,
    });
    if (feed) return feed;
  }

  const nameKey = makeNameKey(value);
  const feedByKey = await GitHubFeed.findOne({ guildId, nameKey });
  if (feedByKey) return feedByKey;

  const feeds = await getWatchedFeeds(guildId);
  return (
    feeds.find((feed) => {
      const repoParts = getRepoPartsFromFeed(feed);
      return (
        makeNameKey(getFeedDisplayName(feed)) === nameKey ||
        makeNameKey(repoParts?.slug) === nameKey
      );
    }) || null
  );
}

async function fetchInitialState(owner, repo, branch) {
  const headers = getGitHubHeaders();
  const initialState = {
    lastCommitSha: undefined,
    lastIssueId: undefined,
    lastReleaseId: undefined,
  };

  try {
    const commitRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
      { headers }
    );
    initialState.lastCommitSha = commitRes.data.sha;
  } catch (error) {
    // Keep the feed usable even if GitHub is temporarily unavailable.
  }

  try {
    const issueRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&sort=created&direction=desc&per_page=1`,
      { headers }
    );
    const latestIssue = issueRes.data.find((issue) => !issue.pull_request);
    if (latestIssue) initialState.lastIssueId = latestIssue.id;
  } catch (error) {}

  try {
    const relRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`,
      { headers }
    );
    if (relRes.data.length > 0) initialState.lastReleaseId = relRes.data[0].id;
  } catch (error) {}

  return initialState;
}

function buildEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(GITHUB_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "GitHub Feed Tracker" });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("github")
    .setDescription("Track GitHub repositories and send updates")
    .addSubcommand((sub) =>
      sub
        .setName("watch")
        .setDescription("Start watching a GitHub repo")
        .addStringOption((opt) =>
          opt
            .setName("repo")
            .setDescription(
              "GitHub repo URL or owner/repo (e.g., https://github.com/user/repo)"
            )
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to post updates in")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("branch")
            .setDescription("Branch to track (default: main)")
            .setMaxLength(100)
        )
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Short name to use in list, unwatch, rename, and channel")
            .setMaxLength(80)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unwatch")
        .setDescription("Stop watching a GitHub repo")
    )
    .addSubcommand((sub) =>
      sub
        .setName("rename")
        .setDescription("Rename a watched GitHub repo")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Current watched repo name")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("new-name")
            .setDescription("New short name")
            .setRequired(true)
            .setMaxLength(80)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Change where a watched GitHub repo posts updates")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Watched repo name")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("New channel for updates")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List watched repositories in this server")
    ),

  async autocomplete(interaction) {
    const guildId = interaction.guild.id;
    const focused = makeNameKey(interaction.options.getFocused());
    const feeds = await getWatchedFeeds(guildId);

    const choices = feeds
      .map((feed) => {
        const displayName = getFeedDisplayName(feed);
        const repoParts = getRepoPartsFromFeed(feed);
        const label = repoParts?.slug
          ? `${displayName} (${repoParts.slug})`
          : displayName;

        return {
          name: label.slice(0, 100),
          value: displayName.slice(0, 100),
          searchText: makeNameKey(`${displayName} ${repoParts?.slug || ""}`),
        };
      })
      .filter((choice) => !focused || choice.searchText.includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "watch") {
      const repoInput = interaction.options.getString("repo");
      const channel = interaction.options.getChannel("channel");
      const branch = interaction.options.getString("branch") || "main";
      const parsedRepo = parseGitHubRepo(repoInput);

      if (!parsedRepo) {
        const embed = buildEmbed(
          "Invalid GitHub Repository",
          "Use a GitHub URL or `owner/repo`, like `https://github.com/user/repo`."
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const existingFeed = await GitHubFeed.findOne({
        guildId,
        repoUrl: parsedRepo.repoUrl,
      });
      const nameInput = interaction.options.getString("name");
      const displayName = String(
        nameInput || existingFeed?.displayName || parsedRepo.slug
      ).trim();

      if (!displayName) {
        const embed = buildEmbed(
          "Invalid GitHub Feed Name",
          "Give this watched repository a visible name, like `Elysium Bot`."
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const nameConflict = await findNameConflict(
        guildId,
        displayName,
        existingFeed?._id
      );

      if (nameConflict) {
        const embed = buildEmbed(
          "GitHub Feed Name Already Used",
          `\`${displayName}\` is already used for [${nameConflict.repoUrl}](${nameConflict.repoUrl}). Choose another name or rename that feed first.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const initialState = await fetchInitialState(
        parsedRepo.owner,
        parsedRepo.repo,
        branch
      );

      await GitHubFeed.findOneAndUpdate(
        { guildId, repoUrl: parsedRepo.repoUrl },
        {
          guildId,
          repoUrl: parsedRepo.repoUrl,
          displayName,
          nameKey: makeNameKey(displayName),
          channelId: channel.id,
          branch,
          ...initialState,
        },
        { upsert: true }
      );

      const embed = buildEmbed(
        existingFeed ? "GitHub Feed Updated" : "GitHub Feed Added",
        `Now watching **${displayName}** ([${parsedRepo.slug}](${parsedRepo.repoUrl})) on branch \`${branch}\`.\nUpdates will be posted in <#${channel.id}>.`
      );

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "unwatch") {
      const feeds = await getWatchedFeeds(guildId);

      if (!feeds.length) {
        const embed = buildEmbed(
          "No Repositories Tracked",
          "This server is not watching any GitHub repositories."
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const shownFeeds = feeds.slice(0, 25);
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`github_unwatch:${interaction.user.id}`)
        .setPlaceholder("Choose a repository to unwatch")
        .addOptions(
          shownFeeds.map((feed) => {
            const displayName = getFeedDisplayName(feed);
            const repoParts = getRepoPartsFromFeed(feed);
            const repoLabel = repoParts?.slug || feed.repoUrl;

            return {
              label: displayName.slice(0, 100),
              description: repoLabel.slice(0, 100),
              value: String(feed._id),
            };
          })
        );
      const row = new ActionRowBuilder().addComponents(menu);
      const extra =
        feeds.length > shownFeeds.length
          ? `\n\nShowing the first ${shownFeeds.length} watched repositories.`
          : "";
      const embed = buildEmbed(
        "Unwatch GitHub Repository",
        `Select the repository you want to stop watching.${extra}`
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } else if (sub === "rename") {
      const identifier = interaction.options.getString("name");
      const newName = interaction.options.getString("new-name").trim();
      const feed = await findFeedByIdentifier(guildId, identifier);

      if (!newName) {
        const embed = buildEmbed(
          "Invalid GitHub Feed Name",
          "Give this watched repository a visible name, like `Elysium Bot`."
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!feed) {
        const embed = buildEmbed(
          "GitHub Feed Not Found",
          `I couldn't find a watched repo named \`${identifier}\`. Use \`/github list\` to see the current names.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const nameConflict = await findNameConflict(guildId, newName, feed._id);
      if (nameConflict) {
        const embed = buildEmbed(
          "GitHub Feed Name Already Used",
          `\`${newName}\` is already used for [${nameConflict.repoUrl}](${nameConflict.repoUrl}). Choose another name.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const oldName = getFeedDisplayName(feed);
      feed.displayName = newName;
      feed.nameKey = makeNameKey(newName);
      await feed.save();

      const embed = buildEmbed(
        "GitHub Feed Renamed",
        `Renamed **${oldName}** to **${newName}**.`
      );

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "set-channel") {
      const identifier = interaction.options.getString("name");
      const channel = interaction.options.getChannel("channel");
      const feed = await findFeedByIdentifier(guildId, identifier);

      if (!feed) {
        const embed = buildEmbed(
          "GitHub Feed Not Found",
          `I couldn't find a watched repo named \`${identifier}\`. Use \`/github list\` to see the current names.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      feed.channelId = channel.id;
      await feed.save();

      const embed = buildEmbed(
        "GitHub Feed Channel Updated",
        `**${getFeedDisplayName(feed)}** will now post updates in <#${channel.id}>.`
      );

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "list") {
      const feeds = await getWatchedFeeds(guildId);

      if (!feeds.length) {
        const embed = buildEmbed(
          "No Repositories Tracked",
          "This server is not watching any GitHub repositories."
        );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = buildEmbed(
        "Watched GitHub Repositories",
        feeds
          .map((feed) => {
            const displayName = getFeedDisplayName(feed);
            const repoParts = getRepoPartsFromFeed(feed);
            const repoLabel = repoParts?.slug || feed.repoUrl;

            return `• **${displayName}** ([${repoLabel}](${feed.repoUrl})) → <#${feed.channelId}> (Branch: \`${feed.branch}\`)`;
          })
          .join("\n")
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
