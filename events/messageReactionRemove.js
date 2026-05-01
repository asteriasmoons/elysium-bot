const { shouldStarboard } = require("../utils/starboard");
const StarboardEntry = require("../models/StarboardEntry");

module.exports = (client) => {
  client.on("messageReactionRemove", async (reaction, user) => {
    try {
      if (user.bot) return;

      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const { shouldStar, config } = await shouldStarboard(
        reaction.message,
        reaction,
      );

      // shouldStar will be false if count drops below threshold — that's fine,
      // we still want to check if an entry exists and delete it
      if (!config) return;

      const entry = await StarboardEntry.findOne({
        guildId: reaction.message.guild.id,
        originalMessageId: reaction.message.id,
      });

      if (!entry) return;

      // If reaction count drops below threshold, delete the starboard post
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
