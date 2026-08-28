function makeNameKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function trimRepoSuffix(value) {
  return value.replace(/\.git$/i, "").replace(/\/+$/g, "");
}

function parseGitHubRepo(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  let parts;

  try {
    const looksLikeGitHubUrl = /^(https?:\/\/)?(www\.)?github\.com\//i.test(raw);

    if (/^https?:\/\//i.test(raw) || looksLikeGitHubUrl) {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      const host = url.hostname.toLowerCase();
      if (host !== "github.com" && host !== "www.github.com") return null;
      parts = url.pathname.split("/").filter(Boolean);
    } else {
      parts = raw.split("/").filter(Boolean);
    }
  } catch (error) {
    return null;
  }

  if (!parts || parts.length < 2) return null;

  const owner = parts[0];
  const repo = trimRepoSuffix(parts[1]);
  if (!owner || !repo) return null;

  return {
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    slug: `${owner}/${repo}`,
  };
}

function getRepoPartsFromFeed(feed) {
  if (!feed?.repoUrl) return null;
  return parseGitHubRepo(feed.repoUrl);
}

function getFeedDisplayName(feed) {
  const displayName = String(feed?.displayName || "").trim();
  if (displayName) return displayName;

  const parsed = getRepoPartsFromFeed(feed);
  return parsed?.slug || feed?.repoUrl || "GitHub repository";
}

function getGitHubHeaders() {
  const headers = {
    "User-Agent": "Pandoryx-Bot",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

module.exports = {
  getFeedDisplayName,
  getGitHubHeaders,
  getRepoPartsFromFeed,
  makeNameKey,
  parseGitHubRepo,
};
