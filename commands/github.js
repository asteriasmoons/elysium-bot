const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const GitHubFeed = require("../models/GitHubFeed");
const axios = require("axios");

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
              "GitHub repo URL (e.g., https://github.com/user/repo)"
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
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unwatch")
        .setDescription("Stop watching a GitHub repo")
        .addStringOption((opt) =>
          opt
            .setName("repo")
            .setDescription("GitHub repo URL")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List watched repositories in this server")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "watch") {
      const repoUrl = interaction.options.getString("repo");
      const channel = interaction.options.getChannel("channel");
      const branch = interaction.options.getString("branch") || "main";

      const [owner, repo] = repoUrl.split("/").slice(-2);

      // --- Fetch latest commit SHA ---
      let lastCommitSha = undefined;
      try {
        const commitRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
          {
            headers: {
              "User-Agent": "Pandoryx-Bot",
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
          }
        );
        lastCommitSha = commitRes.data.sha;
      } catch (e) {
        // fallback: leave undefined if can't fetch
      }

      // --- Fetch latest issue ID ---
      let lastIssueId = undefined;
      try {
        const issueRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=all&sort=created&direction=desc&per_page=1`,
          {
            headers: {
              "User-Agent": "Pandoryx-Bot",
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
          }
        );
        const latestIssue = issueRes.data.find((i) => !i.pull_request);
        if (latestIssue) lastIssueId = latestIssue.id;
      } catch (e) {}

      // --- Fetch latest release ID ---
      let lastReleaseId = undefined;
      try {
        const relRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`,
          {
            headers: {
              "User-Agent": "Pandoryx-Bot",
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
          }
        );
        if (relRes.data.length > 0) lastReleaseId = relRes.data[0].id;
      } catch (e) {}

      // --- Save to DB ---
      await GitHubFeed.findOneAndUpdate(
        { guildId, repoUrl },
        {
          channelId: channel.id,
          branch,
          lastCommitSha,
          lastIssueId,
          lastReleaseId,
        },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x8f72da)
        .setTitle("GitHub Feed Added")
        .setDescription(
          `Now watching [${repoUrl}](${repoUrl}) on branch \`${branch}\`.\nUpdates will be posted in <#${channel.id}>.`
        )
        .setFooter({ text: "GitHub Feed Tracker" });

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "unwatch") {
      const repoUrl = interaction.options.getString("repo");
      await GitHubFeed.deleteOne({ guildId, repoUrl });

      const embed = new EmbedBuilder()
        .setColor(0x8f72da)
        .setTitle("GitHub Feed Removed")
        .setDescription(`No longer watching [${repoUrl}](${repoUrl}).`)
        .setFooter({ text: "GitHub Feed Tracker" });

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "list") {
      const feeds = await GitHubFeed.find({ guildId });

      if (!feeds.length) {
        const embed = new EmbedBuilder()
          .setColor(0x8f72da)
          .setTitle("No Repositories Tracked")
          .setDescription(
            "This server is not watching any GitHub repositories."
          )
          .setFooter({ text: "GitHub Feed Tracker" });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x8f72da)
        .setTitle("Watched GitHub Repositories")
        .setDescription(
          feeds
            .map(
              (f) =>
                `• [${f.repoUrl}](${f.repoUrl}) → <#${f.channelId}> (Branch: \`${f.branch}\`)`
            )
            .join("\n")
        )
        .setFooter({ text: "GitHub Feed Tracker" });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
