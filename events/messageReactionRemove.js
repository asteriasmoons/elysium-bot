const StarboardEntry = require("../models/StarboardEntry");
const StarboardConfig = require("../models/StarboardConfig");

module.exports = (client) => {
  client.on("messageReactionRemove", async (reaction, user) => {
    try {
      if (user.bot) return;
      if (!reaction.message.guild) return;

      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const guildId = reaction.message.guild.id;

      const config = await StarboardConfig.findOne({ guildId });
      if (!config || !config.enabled) return;

      // Check the emoji matches
      const emojiStr = reaction.emoji.id
        ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
        : reaction.emoji.name;
      if (emojiStr !== config.emoji) return;

      const entry = await StarboardEntry.findOne({
        guildId,
        originalMessageId: reaction.message.id,
      });
      if (!entry) return;

      // Delete the starboard post if count drops below threshold
      if (reaction.count < config.threshold) {
        const starChannel = reaction.message.guild.channels.cache.get(
          config.channelId,
        );

        if (starChannel) {
          const starPost = await starChannel.messages
            .fetch(entry.starboardMessageId)
            .catch(() => null);
          if (starPost) await starPost.delete().catch(() => {});
        }

        await StarboardEntry.deleteOne({ _id: entry._id });
      }
    } catch (err) {
      console.error("[starboard] messageReactionRemove error:", err);
    }
  });
};
