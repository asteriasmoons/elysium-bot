const { EmbedBuilder } = require("discord.js");
const { shouldStarboard } = require("../utils/starboard");

module.exports = (client) => {
  client.on("messageReactionAdd", async (reaction, user) => {
    try {
      if (user.bot) return;

      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const { shouldStar, config } = await shouldStarboard(
        reaction.message,
        reaction,
      );

      if (!shouldStar) return;

      const starChannel = reaction.message.guild.channels.cache.get(
        config.channelId,
      );
      if (!starChannel) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: reaction.message.author.tag,
          iconURL: reaction.message.author.displayAvatarURL(),
        })
        .setDescription(reaction.message.content || "[No text content]")
        .setFooter({ text: `${reaction.count} | ${reaction.message.id}` })
        .setTimestamp(reaction.message.createdAt)
        .setColor(0x663399)
        .setURL(reaction.message.url);

      if (reaction.message.attachments.size > 0) {
        embed.setImage(reaction.message.attachments.first().url);
      }

      await starChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[starboard] messageReactionAdd error:", err);
    }
  });
};
