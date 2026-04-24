// handlers/ticketPanelButtonHandler.js

const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const TicketPanel = require("../models/TicketPanel");
const { sendGreetingEmbedEditor } = require("../events/ticketPanelUi");

module.exports = async function handleTicketPanelButtons(interaction) {
  if (!interaction.isButton()) return false;

  // --- Toggle Transcript ---
  if (interaction.customId.startsWith("ticketpanel_toggle_transcript:")) {
    const panelId = interaction.customId.split(":")[1];
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    panel.transcriptsEnabled = !panel.transcriptsEnabled;
    await panel.save();

    await interaction.reply({
      content: `Transcript generation has been **${
        panel.transcriptsEnabled ? "enabled" : "disabled"
      }** for this panel.`,
    });

    return true;
  }

  // --- Publish Preview ---
  if (interaction.customId.startsWith("ticketpanel_publish_preview:")) {
    const panelId = interaction.customId.split(":")[1];
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    const channel = interaction.guild.channels.cache.get(panel.postChannelId);

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: "Panel post channel is invalid or not set.",
        ephemeral: false,
      });
      return true;
    }

    const button = new ButtonBuilder()
      .setCustomId(`open_ticket_modal:${panel.panelName}`)
      .setLabel(panel.buttonLabel || "Open Ticket")
      .setStyle(ButtonStyle.Secondary);

    if (panel.emoji) button.setEmoji(panel.emoji);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setTitle(panel.embed?.title || "Need Help?")
      .setDescription(
        panel.embed?.description || "Click the button below to open a ticket.",
      )
      .setColor(panel.embed?.color || 0x5865f2);

    if (panel.embed?.author?.name || panel.embed?.author?.icon_url) {
      embed.setAuthor({
        name: panel.embed.author.name || "",
        iconURL: panel.embed.author.icon_url || undefined,
      });
    }

    if (panel.embed?.footer?.text || panel.embed?.footer?.icon_url) {
      embed.setFooter({
        text: panel.embed.footer.text || "",
        iconURL: panel.embed.footer.icon_url || undefined,
      });
    }

    if (panel.embed?.thumbnail) embed.setThumbnail(panel.embed.thumbnail);
    if (panel.embed?.image) embed.setImage(panel.embed.image);

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `Ticket panel preview has been posted to <#${channel.id}>.`,
    });

    return true;
  }

  // --- Greeting Embed Editor UI ---
  if (interaction.customId.startsWith("ticketpanel_edit_greeting_embed:")) {
    const panelId = interaction.customId.split(":")[1];
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    await sendGreetingEmbedEditor(interaction, panel);
    return true;
  }

  // --- Greeting Embed Buttons ---
  if (
    interaction.customId.startsWith("greeting_edit_embed_basic:") ||
    interaction.customId.startsWith("greeting_edit_embed_author:") ||
    interaction.customId.startsWith("greeting_edit_embed_footer:") ||
    interaction.customId.startsWith("greeting_edit_embed_images:")
  ) {
    const [action, panelId] = interaction.customId.split(":");
    const section = action.replace("greeting_edit_embed_", "");
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    const ge = panel.greetingEmbed || {};

    if (section === "basic") {
      const modal = new ModalBuilder()
        .setCustomId(`greeting_modal_embed_basic:${panelId}`)
        .setTitle("Edit Greeting Embed - Basic Info")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("title")
              .setLabel("Title")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.title || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("description")
              .setLabel("Description")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setValue(ge.description || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("color")
              .setLabel("Embed Color (Hex)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.color || "#5103aa"),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "author") {
      const modal = new ModalBuilder()
        .setCustomId(`greeting_modal_embed_author:${panelId}`)
        .setTitle("Edit Greeting Embed - Author")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("author_name")
              .setLabel("Author Name")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.author?.name || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("author_icon")
              .setLabel("Author Icon URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.author?.icon_url || ""),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "footer") {
      const modal = new ModalBuilder()
        .setCustomId(`greeting_modal_embed_footer:${panelId}`)
        .setTitle("Edit Greeting Embed - Footer")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_text")
              .setLabel("Footer Text")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.footer?.text || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_icon")
              .setLabel("Footer Icon URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.footer?.icon_url || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_timestamp")
              .setLabel("Add Timestamp? (yes/no)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.footer?.timestamp ? "yes" : "no"),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "images") {
      const modal = new ModalBuilder()
        .setCustomId(`greeting_modal_embed_images:${panelId}`)
        .setTitle("Edit Greeting Embed - Images")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("thumbnail")
              .setLabel("Thumbnail URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.thumbnail || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("image")
              .setLabel("Main Image URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(ge.image || ""),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }
  }

  // --- Ticket Panel Embed Buttons ---
  if (
    interaction.customId.startsWith("ticketpanel_edit_embed_basic:") ||
    interaction.customId.startsWith("ticketpanel_edit_embed_author:") ||
    interaction.customId.startsWith("ticketpanel_edit_embed_footer:") ||
    interaction.customId.startsWith("ticketpanel_edit_embed_images:")
  ) {
    const [action, panelId] = interaction.customId.split(":");
    const section = action.replace("ticketpanel_edit_embed_", "");
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    if (section === "basic") {
      const modal = new ModalBuilder()
        .setCustomId(`ticketpanel_modal_embed_basic:${panelId}`)
        .setTitle("Edit Ticket Panel Embed - Basic Info")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("title")
              .setLabel("Title")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.title || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("description")
              .setLabel("Description")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setValue(panel.embed?.description || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("color")
              .setLabel("Embed Color (Hex)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.color || "#7d04c3"),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "author") {
      const modal = new ModalBuilder()
        .setCustomId(`ticketpanel_modal_embed_author:${panelId}`)
        .setTitle("Edit Ticket Panel Embed - Author")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("author_name")
              .setLabel("Author Name")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.author?.name || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("author_icon")
              .setLabel("Author Icon URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.author?.icon_url || ""),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "footer") {
      const modal = new ModalBuilder()
        .setCustomId(`ticketpanel_modal_embed_footer:${panelId}`)
        .setTitle("Edit Ticket Panel Embed - Footer")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_text")
              .setLabel("Footer Text")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.footer?.text || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_icon")
              .setLabel("Footer Icon URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.footer?.icon_url || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("footer_timestamp")
              .setLabel("Add Timestamp? (yes/no)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.footer?.timestamp ? "yes" : "no"),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }

    if (section === "images") {
      const modal = new ModalBuilder()
        .setCustomId(`ticketpanel_modal_embed_images:${panelId}`)
        .setTitle("Edit Ticket Panel Embed - Images")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("thumbnail")
              .setLabel("Thumbnail URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.thumbnail || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("image")
              .setLabel("Main Image URL")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(panel.embed?.image || ""),
          ),
        );

      await interaction.showModal(modal);
      return true;
    }
  }

  // --- Set Emoji ---
  if (interaction.customId.startsWith("ticketpanel_set_emoji:")) {
    const panelId = interaction.customId.split(":")[1];
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      await interaction.reply({
        content: "Panel not found.",
        ephemeral: false,
      });
      return true;
    }

    await interaction.reply({
      content:
        "Please send the emoji you want to use (standard or custom). You have 3 minutes.",
    });

    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({
      filter,
      max: 1,
      time: 180000,
    });

    collector.on("collect", async (msg) => {
      const emoji = msg.content.trim();
      const isCustom = /^<a?:\w+:\d+>$/.test(emoji);
      const isUnicode = /\p{Emoji}/u.test(emoji);

      if (!isCustom && !isUnicode) {
        return msg.reply(
          "Invalid emoji. Please use a standard or custom emoji.",
        );
      }

      panel.emoji = emoji;
      await panel.save();

      await msg.reply(`Emoji set to ${emoji}`);
    });

    collector.on("end", (collected) => {
      if (!collected.size) {
        interaction.followUp({
          content: "Emoji input timed out.",
          ephemeral: false,
        });
      }
    });

    return true;
  }

  return false;
};
