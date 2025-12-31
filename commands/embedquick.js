// commands/embedquick.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

    // Mention pickers (up to 3)
    .addMentionableOption((o) =>
      o
        .setName("mention1")
        .setDescription("Optional mention (user or role)")
        .setRequired(false)
    )
    .addMentionableOption((o) =>
      o
        .setName("mention2")
        .setDescription("Optional mention (user or role)")
        .setRequired(false)
    )
    .addMentionableOption((o) =>
      o
        .setName("mention3")
        .setDescription("Optional mention (user or role)")
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
        .setDescription("Preview with a Send button")
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

    const mention1 = interaction.options.getMentionable("mention1");
    const mention2 = interaction.options.getMentionable("mention2");
    const mention3 = interaction.options.getMentionable("mention3");

    // Build content string from chosen mentions (can be empty)
    const mentionsArr = [mention1, mention2, mention3].filter(Boolean);
    const content = mentionsArr.length
      ? mentionsArr.map((m) => m.toString()).join(" ")
      : null;

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

    // If preview: show embed ephemerally + Send/Cancel buttons
    if (preview) {
      const sendId = `eqsend:${interaction.user.id}:${targetChannel.id}`;
      const cancelId = `eqcancel:${interaction.user.id}`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(sendId)
          .setLabel("Send")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: content || undefined,
        embeds: [embed],
        components: [row],
        ephemeral: EPHEMERAL,
        // Allow only the mentions the user selected (safe + clean)
        allowedMentions: {
          users: mentionsArr.filter((m) => m?.user).map((m) => m.id),
          roles: mentionsArr.filter((m) => m?.name && !m.user).map((m) => m.id),
        },
      });
    }

    // Non-preview: send immediately
    const me = interaction.guild?.members?.me;
    const perms = me ? targetChannel.permissionsFor(me) : null;

    if (!perms?.has("SendMessages") || !perms?.has("EmbedLinks")) {
      return interaction.reply({
        content: "I don't have permission to send embeds in that channel.",
        ephemeral: EPHEMERAL,
        allowedMentions: { parse: [] },
      });
    }

    await targetChannel.send({
      content: content || undefined,
      embeds: [embed],
      allowedMentions: {
        users: mentionsArr.filter((m) => m?.user).map((m) => m.id),
        roles: mentionsArr.filter((m) => m?.name && !m.user).map((m) => m.id),
      },
    });

    return interaction.reply({
      content: `Sent.`,
      ephemeral: EPHEMERAL,
      allowedMentions: { parse: [] },
    });
  },
};
