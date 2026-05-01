const { EmbedBuilder } = require("discord.js");
const { shouldStarboard } = require("../utils/starboard");
const StarboardEntry = require("../models/StarboardEntry");

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

      // Don't post duplicates
      const existing = await StarboardEntry.findOne({
        guildId: reaction.message.guild.id,
        originalMessageId: reaction.message.id,
      }).catch(() => null);
      if (existing) return;

      const starChannel = reaction.message.guild.channels.cache.get(
        config.channelId,
      );
      if (!starChannel) return;

      const msg = reaction.message;
      const hasText = msg.content && msg.content.length > 0;
      const hasAttachment = msg.attachments.size > 0;
      const hasEmbeds = msg.embeds.length > 0;

      const wrapperEmbed = new EmbedBuilder()
        .setAuthor({
          name: msg.author.tag,
          iconURL: msg.author.displayAvatarURL(),
        })
        .setFooter({ text: `${reaction.count} | ${msg.id}` })
        .setTimestamp(msg.createdAt)
        .setColor(0x663399)
        .setURL(msg.url);

      if (hasText) wrapperEmbed.setDescription(msg.content);

      if (hasAttachment) {
        const image = msg.attachments.find((a) =>
          a.contentType?.startsWith("image/")
        );
        if (image) wrapperEmbed.setImage(image.url);
      }

      const toSend = [wrapperEmbed];

      if (hasEmbeds) {
        for (const srcEmbed of msg.embeds.slice(0, 10)) {
          toSend.push(EmbedBuilder.from(srcEmbed));
        }
      }

      const posted = await starChannel.send({
        content: `[Jump to message](${msg.url})`,
        embeds: toSend,
      });

      // Save the mapping so we can delete it on unstar
      await StarboardEntry.create({
        guildId: msg.guild.id,
        originalMessageId: msg.id,
        starboardMessageId: posted.id,
      }).catch(() => {});
    } catch (err) {
      console.error("[starboard] messageReactionAdd error:", err);
    }
  });
};
