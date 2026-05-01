const StarboardConfig = require("../models/StarboardConfig");

/**
 * Determines if a message/reaction should trigger Starboard.
 * @param {Message} message
 * @param {MessageReaction} reaction
 * @returns { shouldStar: boolean, config?: object }
 */
async function shouldStarboard(message, reaction) {
  if (!message.guild) return { shouldStar: false };

  const config = await StarboardConfig.findOne({ guildId: message.guild.id });
  if (!config || !config.enabled) return { shouldStar: false };

  // Get the emoji string for comparison
  const emojiStr = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : reaction.emoji.name;

  if (emojiStr !== config.emoji) return { shouldStar: false };

  // Don't star bot messages (optional)
  if (message.author.bot) return { shouldStar: false };

  // Threshold check
  if (reaction.count < config.threshold) return { shouldStar: false };

  return { shouldStar: true, config };
}

module.exports = { shouldStarboard };
