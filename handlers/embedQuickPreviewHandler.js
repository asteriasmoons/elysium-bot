// handlers/embedQuickPreviewHandler.js

const { EmbedBuilder } = require("discord.js");

module.exports = async function handleEmbedQuickPreview(interaction) {
  if (!interaction.isButton()) return false;

  const { customId } = interaction;

  // === SEND PREVIEW ===
  if (customId.startsWith("eqsend:")) {
    const [, ownerId, channelId] = customId.split(":");

    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        content: "This preview isn't yours.",
        ephemeral: true,
      });
      return true;
    }

    const channel = await interaction.guild.channels
      .fetch(channelId)
      .catch(() => null);

    if (!channel) {
      await interaction.update({
        content: "I couldn't find that channel anymore.",
        components: [],
      });
      return true;
    }

    const me = interaction.guild?.members?.me;
    const perms = me ? channel.permissionsFor(me) : null;

    if (!perms?.has("SendMessages") || !perms?.has("EmbedLinks")) {
      await interaction.update({
        content: "I don't have permission to send embeds in that channel.",
        components: [],
      });
      return true;
    }

    const apiEmbed = interaction.message.embeds?.[0];
    if (!apiEmbed) {
      await interaction.update({
        content: "No embed found to send.",
        components: [],
      });
      return true;
    }

    const embed = EmbedBuilder.from(apiEmbed);

    const content = interaction.message.content?.length
      ? interaction.message.content
      : undefined;

    await channel.send({
      content,
      embeds: [embed],
      allowedMentions: {
        parse: ["users", "roles"],
      },
    });

    await interaction.update({
      content: "Sent.",
      components: [],
    });

    return true;
  }

  // === CANCEL PREVIEW ===
  if (customId.startsWith("eqcancel:")) {
    const [, ownerId] = customId.split(":");

    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        content: "This preview isn't yours.",
        ephemeral: true,
      });
      return true;
    }

    await interaction.update({
      content: "Canceled.",
      components: [],
    });

    return true;
  }

  return false;
};
