const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const GitHubFeed = require("../models/GitHubFeed");
const {
  getFeedDisplayName,
  getGitHubHeaders,
  getRepoPartsFromFeed,
} = require("./githubFeedUtils");

async function checkGitHubFeeds(client) {
  const feeds = await GitHubFeed.find();

  for (const feed of feeds) {
    try {
      const parsedRepo = getRepoPartsFromFeed(feed);
      if (!parsedRepo) continue;

      const { owner, repo } = parsedRepo;
      const displayName = getFeedDisplayName(feed);
      const channel = await client.channels.fetch(feed.channelId);
      if (!channel) continue;

      // === COMMITS ===
      const commitsRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits?sha=${feed.branch}`,
        {
          headers: getGitHubHeaders(),
        }
      );
      const commits = commitsRes.data;

      if (Array.isArray(commits) && commits.length > 0) {
        if (!feed.lastCommitSha) {
          // First run: set to latest commit, skip posting
          feed.lastCommitSha = commits[0].sha;
          await feed.save();
        } else {
          const newCommits = [];
          for (const commit of commits) {
            if (commit.sha === feed.lastCommitSha) break;
            newCommits.push(commit);
          }
          newCommits.reverse();

          for (const commitData of newCommits) {
            const commit = commitData.commit;
            const shortSha = commitData.sha.slice(0, 7);
            const authorName = commit.author?.name || "Unknown";
            const avatar = commitData.author?.avatar_url;

            const embed = new EmbedBuilder()
              .setColor(0x8f72da)
              .setTitle(`📥 New Commit: ${shortSha}`)
              .setURL(commitData.html_url)
              .setDescription(commit.message || "*No commit message*")
              .addFields(
                { name: "Author", value: authorName, inline: true },
                { name: "Branch", value: feed.branch, inline: true },
                {
                  name: "Repo",
                  value: `[${displayName}](${feed.repoUrl})`,
                  inline: true,
                }
              )
              .setTimestamp(new Date(commit.author.date))
              .setFooter({ text: `${displayName} • Commit` });

            if (avatar) embed.setThumbnail(avatar);
            await channel.send({ embeds: [embed] });
            await channel.send(commitData.html_url);
          }
          // After all new commits, update to latest
          feed.lastCommitSha = commits[0].sha;
          await feed.save();
        }
      }

      // === ISSUES ===
      const issuesRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc`,
        {
          headers: getGitHubHeaders(),
        }
      );
      const issues = issuesRes.data;

      if (Array.isArray(issues) && issues.length > 0) {
        // Find the latest real issue (not a PR)
        const latestIssue = issues.find((i) => !i.pull_request);

        if (!feed.lastIssueId && latestIssue) {
          // First run: set to latest issue, skip posting
          feed.lastIssueId = latestIssue.id;
          await feed.save();
        } else {
          for (const issue of issues) {
            if (issue.pull_request) continue; // ignore PRs
            if (feed.lastIssueId && issue.id <= feed.lastIssueId) break;

            const embed = new EmbedBuilder()
              .setColor(0x8f72da)
              .setTitle(`New Issue: #${issue.number} - ${issue.title}`)
              .setURL(issue.html_url)
              .setDescription(issue.body?.slice(0, 300) || "*No description*")
              .addFields(
                {
                  name: "Author",
                  value: issue.user?.login || "Unknown",
                  inline: true,
                },
                {
                  name: "Repo",
                  value: `[${displayName}](${feed.repoUrl})`,
                  inline: true,
                }
              )
              .setTimestamp(new Date(issue.created_at))
              .setFooter({ text: `${displayName} • Issue` });

            if (issue.user?.avatar_url)
              embed.setThumbnail(issue.user.avatar_url);

            await channel.send({ embeds: [embed] });
            await channel.send(issue.html_url);

            // update lastIssueId after posting
            if (!feed.lastIssueId || issue.id > feed.lastIssueId) {
              feed.lastIssueId = issue.id;
            }
          }
          await feed.save();
        }
      }

      // === RELEASES ===
      const releasesRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/releases`,
        {
          headers: getGitHubHeaders(),
        }
      );
      const releases = releasesRes.data;

      if (Array.isArray(releases) && releases.length > 0) {
        if (!feed.lastReleaseId) {
          // First run: set to latest release, skip posting
          feed.lastReleaseId = releases[0].id;
          await feed.save();
        } else {
          for (const release of releases) {
            if (feed.lastReleaseId && release.id <= feed.lastReleaseId) break;

            const embed = new EmbedBuilder()
              .setColor(0x8f72da)
              .setTitle(`New Release: ${release.name || release.tag_name}`)
              .setURL(release.html_url)
              .setDescription(release.body?.slice(0, 500) || "*No description*")
              .addFields(
                {
                  name: "Repo",
                  value: `[${displayName}](${feed.repoUrl})`,
                  inline: true,
                },
                { name: "Tag", value: release.tag_name, inline: true }
              )
              .setTimestamp(new Date(release.published_at))
              .setFooter({ text: `${displayName} • Release` });

            await channel.send({ embeds: [embed] });
            await channel.send(release.html_url);

            if (!feed.lastReleaseId || release.id > feed.lastReleaseId) {
              feed.lastReleaseId = release.id;
            }
          }
          await feed.save();
        }
      }
    } catch (err) {
      console.error(
        `Error checking ${feed.repoUrl}:`,
        err.response?.data?.message || err.message
      );
    }
  }
}

module.exports = { checkGitHubFeeds };
