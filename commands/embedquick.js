// commands/embedquick.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");

const EPHEMERAL = true;

function parseHexColor(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/.test(raw)) return null;
  return parseInt(raw, 16);
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embedquick")
    .setDescription("Create an embed quickly with minimal options.")
    // Adjust permission as you like
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    // Required
    .addStringOption((o) =>
      o.setName("title").setDescription("Embed title").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("description")
        .setDescription("Embed description")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("color")
        .setDescription("Hex color like #7740a3 (or 7740a3)")
        .setRequired(true)
    )

    // Optional
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Where to send it (defaults to this channel)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addBooleanOption((o) =>
      o
        .setName("mentions")
        .setDescription("Allow user/role mentions in the embed content")
        .setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("author_name").setDescription("Author name")
    )
    .addStringOption((o) =>
      o.setName("author_icon").setDescription("Author icon URL")
    )
    .addStringOption((o) =>
      o.setName("footer_text").setDescription("Footer text")
    )
    .addStringOption((o) =>
      o.setName("footer_icon").setDescription("Footer icon URL")
    )
    .addStringOption((o) =>
      o.setName("thumbnail").setDescription("Thumbnail URL")
    )
    .addStringOption((o) => o.setName("image").setDescription("Image URL"))
    .addBooleanOption((o) =>
      o
        .setName("timestamp")
        .setDescription("Add a timestamp")
        .setRequired(false)
    )
    .addBooleanOption((o) =>
      o
        .setName("preview")
        .setDescription("Preview instead of sending")
        .setRequired(false)
    ),

  async execute(interaction) {
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const colorInput = interaction.options.getString("color", true);

    const color = parseHexColor(colorInput);
    if (color == null) {
      return interaction.reply({
        content: "Invalid color. Use hex like #7740a3 or 7740a3.",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    const targetChannel =
      interaction.options.getChannel("channel") || interaction.channel;

    // Default: no pings unless mentions:true explicitly
    const mentions = interaction.options.getBoolean("mentions") ?? false;
    const allowedMentions = mentions ? undefined : { parse: [] };

    const authorName = interaction.options.getString("author_name");
    const authorIcon = interaction.options.getString("author_icon");

    const footerText = interaction.options.getString("footer_text");
    const footerIcon = interaction.options.getString("footer_icon");

    const thumbnail = interaction.options.getString("thumbnail");
    const image = interaction.options.getString("image");

    const timestamp = interaction.options.getBoolean("timestamp") ?? false;
    const preview = interaction.options.getBoolean("preview") ?? false;

    // Validate URLs (only if provided)
    if (authorIcon && !isValidHttpUrl(authorIcon)) {
      return interaction.reply({
        content: "Invalid author_icon URL. Must start with http:// or https://",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    if (footerIcon && !isValidHttpUrl(footerIcon)) {
      return interaction.reply({
        content: "Invalid footer_icon URL. Must start with http:// or https://",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    if (thumbnail && !isValidHttpUrl(thumbnail)) {
      return interaction.reply({
        content: "Invalid thumbnail URL. Must start with http:// or https://",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    if (image && !isValidHttpUrl(image)) {
      return interaction.reply({
        content: "Invalid image URL. Must start with http:// or https://",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);

    if (authorName) {
      embed.setAuthor({
        name: authorName,
        iconURL: authorIcon || undefined,
      });
    }

    if (footerText) {
      embed.setFooter({
        text: footerText,
        iconURL: footerIcon || undefined,
      });
    }

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (timestamp) embed.setTimestamp(new Date());

    // Preview: reply with the embed only (ephemeral)
    if (preview) {
      return interaction.reply({
        embeds: [embed],
        allowedMentions,
        ephemeral: EPHEMERAL,
      });
    }

    // Permission check to avoid silent failures
    const me = interaction.guild?.members?.me;
    const perms = me ? targetChannel.permissionsFor(me) : null;

    if (!perms?.has("SendMessages") || !perms?.has("EmbedLinks")) {
      return interaction.reply({
        content: "I don't have permission to send embeds in that channel.",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    await targetChannel.send({ embeds: [embed], allowedMentions });

    return interaction.reply({
      content: `Embed sent in ${targetChannel}.`,
      ephemeral: EPHEMERAL,
      allowedMentions: { parse: [] },
    });
  },
};
