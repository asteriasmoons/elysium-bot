const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const VerifyPanel = require("../models/VerifyPanel");

function parseButtonEmoji(emojiString, guild) {
  if (!emojiString) return null;
  const customEmoji = emojiString.match(/^<a?:(\w+):(\d+)>$/);
  if (customEmoji) {
    const [, name, id] = customEmoji;
    const found = guild.emojis.cache.get(id);
    if (!found) return null;
    return { id: found.id, name: found.name, animated: found.animated };
  }
  return emojiString;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verification panel setup and management")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Send a verification panel")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to assign when verified")
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("remove_role")
            .setDescription("Role to remove when verified (optional)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Embed title")
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("Embed description")
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("Embed color hex (e.g. #5865F2)")
        )
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription("Button emoji (Unicode or custom, e.g. <:name:id>)")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel_edit")
        .setDescription("Edit the verification panel")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to assign when verified")
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("remove_role")
            .setDescription("Role to remove when verified (optional)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Embed title")
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("Embed description")
        )
        .addStringOption((opt) =>
          opt.setName("color").setDescription("Embed color hex (e.g. #5865F2)")
        )
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription("Button emoji (Unicode or custom, e.g. <:name:id>)")
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // Options for both create/edit
    const role = interaction.options.getRole("role");
    const removeRole = interaction.options.getRole("remove_role");
    const title =
      interaction.options.getString("title") ?? "Verification Required";
    const description =
      interaction.options.getString("description") ??
      "Click the button below to verify yourself!";
    const color = interaction.options.getString("color") ?? "#5865F2";
    const emojiInput = interaction.options.getString("emoji");
    const parsedEmoji = parseButtonEmoji(emojiInput, interaction.guild);

    if (sub === "panel") {
      // --- CREATE NEW PANEL ---
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      const button = new ButtonBuilder()
        .setCustomId("verify_panel_button")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Secondary);

      if (parsedEmoji) button.setEmoji(parsedEmoji);

      const row = new ActionRowBuilder().addComponents(button);

      const msg = await interaction.channel.send({
        embeds: [embed],
        components: [row],
      });

      // Save to DB
      await VerifyPanel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          guildId: interaction.guild.id,
          channelId: msg.channel.id,
          messageId: msg.id,
          roleId: role.id,
          removeRoleId: removeRole ? removeRole.id : null,
          title,
          description,
          color,
          emoji: emojiInput || null,
        },
        { upsert: true }
      );

      await interaction.reply({
        content: "Verification panel sent and saved!",
        ephemeral: true,
      });
    }

    if (sub === "panel_edit") {
      // --- EDIT EXISTING PANEL ---
      const config = await VerifyPanel.findOne({
        guildId: interaction.guild.id,
      });
      if (!config)
        return interaction.reply({
          content: "No verification panel found. Use `/verify panel` first.",
          ephemeral: true,
        });

      // Update DB
      config.roleId = role.id;
      config.removeRoleId = removeRole ? removeRole.id : null;
      config.title = title;
      config.description = description;
      config.color = color;
      config.emoji = emojiInput || null;
      await config.save();

      // Rebuild components
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      const button = new ButtonBuilder()
        .setCustomId("verify_panel_button")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Secondary);
      if (parsedEmoji) button.setEmoji(parsedEmoji);

      const row = new ActionRowBuilder().addComponents(button);

      // Fetch and edit original message
      const channel = await interaction.guild.channels.fetch(config.channelId);
      if (!channel)
        return interaction.reply({
          content: "Channel not found.",
          ephemeral: true,
        });
      const msg = await channel.messages
        .fetch(config.messageId)
        .catch(() => null);
      if (!msg)
        return interaction.reply({
          content: "Panel message not found.",
          ephemeral: true,
        });

      await msg.edit({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: "Verification panel updated!",
        ephemeral: true,
      });
    }
  },
};