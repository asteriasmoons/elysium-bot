const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const StickyEmbed = require("../models/StickyEmbed"); // Your Mongo model

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Sticky embed system")
    .addSubcommandGroup((group) =>
      group
        .setName("embed")
        .setDescription("Sticky embed management")
        .addSubcommand((sub) =>
          sub
            .setName("create")
            .setDescription("Create a sticky embed")
            .addStringOption((opt) =>
              opt
                .setName("name")
                .setDescription("Unique name")
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName("title")
                .setDescription("Embed title")
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName("description")
                .setDescription("Embed description")
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName("color")
                .setDescription("Hex color (#ABCDEF)")
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("edit")
            .setDescription("Edit a sticky embed")
            .addStringOption((opt) =>
              opt
                .setName("name")
                .setDescription("Name of the sticky embed")
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName("title")
                .setDescription("New title")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("description")
                .setDescription("New description")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("color")
                .setDescription("New color (#ABCDEF)")
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("send")
            .setDescription("Send a sticky embed to a channel")
            .addStringOption((opt) =>
              opt
                .setName("name")
                .setDescription("Name of the sticky embed")
                .setRequired(true)
            )
            .addChannelOption((opt) =>
              opt
                .setName("channel")
                .setDescription("Channel to send to")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("delete")
            .setDescription("Delete a sticky embed")
            .addStringOption((opt) =>
              opt
                .setName("name")
                .setDescription("Name of the sticky embed")
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a sticky embed from a channel")
            .addStringOption((opt) =>
              opt
                .setName("name")
                .setDescription("Name of the sticky embed")
                .setRequired(true)
            )
            .addChannelOption((opt) =>
              opt
                .setName("channel")
                .setDescription("Channel to remove from")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription("List all sticky embeds in this server")
        )
    ),

  async execute(interaction) {
    // ==== PREMIUM CHECK START ====
    const premiumRoleId = "1391553226293252147";
    const ownerId = "1202652142482231417"; // MY Discord ID

    if (
      !interaction.member.roles.cache.has(premiumRoleId) &&
      interaction.user.id !== ownerId
    ) {
      const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle("🔒 Premium Only")
        .setDescription(
          "This command is for premium users only.\nBuy a Server Subscription to unlock access!"
        );

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } // ==== PREMIUM CHECK END ====

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (group !== "embed") return;

    // REMOVE STICKY
    if (sub === "remove") {
      const name = interaction.options.getString("name");
      const channel = interaction.options.getChannel("channel");
      const sticky = await StickyEmbed.findOne({
        guildId: interaction.guildId,
        name,
      });

      if (!sticky) {
        await interaction.reply({
          content: "Sticky embed not found.",
          ephemeral: true,
        });
        return;
      }

      const stickyInfo = sticky.stickies?.find(
        (s) => s.channelId === channel.id
      );

      // Try to delete the old sticky message if possible
      if (stickyInfo && stickyInfo.messageId) {
        try {
          const msg = await channel.messages.fetch(stickyInfo.messageId);
          if (msg) await msg.delete();
        } catch (e) {
          // Ignore errors (message might not exist or can't delete)
          console.log("Could not delete old sticky message:", e.message);
        }
      }

      // Remove the sticky assignment for this channel
      sticky.stickies =
        sticky.stickies?.filter((s) => s.channelId !== channel.id) || [];
      await sticky.save();

      await interaction.reply({
        content: `Sticky embed \`${name}\` removed from ${channel}.`,
        ephemeral: true,
      });
      return;
    }

    // CREATE
    if (sub === "create") {
      const name = interaction.options.getString("name");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color") || "#5865F2";

      // Ensure unique name per guild
      const existing = await StickyEmbed.findOne({
        guildId: interaction.guildId,
        name,
      });
      if (existing)
        return interaction.reply({
          content: "A sticky embed with that name already exists.",
          ephemeral: true,
        });

      await StickyEmbed.create({
        guildId: interaction.guildId,
        name,
        embed: { title, description, color },
        stickies: [],
      });

      return interaction.reply({
        content: `Sticky embed \`${name}\` created.`,
        ephemeral: true,
      });
    }

    // EDIT
    if (sub === "edit") {
      const name = interaction.options.getString("name");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color");

      const sticky = await StickyEmbed.findOne({
        guildId: interaction.guildId,
        name,
      });
      if (!sticky)
        return interaction.reply({
          content: "Sticky embed not found.",
          ephemeral: true,
        });

      // Only update if a value is provided
      if (title) sticky.embed.title = title;
      if (description) sticky.embed.description = description;
      if (color) sticky.embed.color = color;

      await sticky.save();
      return interaction.reply({
        content: `Sticky embed \`${name}\` updated.`,
        ephemeral: true,
      });
    }

    // SEND
    if (sub === "send") {
      const name = interaction.options.getString("name");
      const channel = interaction.options.getChannel("channel");
      const sticky = await StickyEmbed.findOne({
        guildId: interaction.guildId,
        name,
      });
      if (!sticky)
        return interaction.reply({
          content: "Sticky embed not found.",
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle(sticky.embed.title)
        .setDescription(sticky.embed.description)
        .setColor(sticky.embed.color || "#5865F2");

      const msg = await channel.send({ embeds: [embed] });

      // Remove existing sticky for this channel if any
      sticky.stickies =
        sticky.stickies?.filter((s) => s.channelId !== channel.id) || [];

      // Add new sticky placement
      sticky.stickies.push({ channelId: channel.id, messageId: msg.id });
      await sticky.save();

      return interaction.reply({
        content: `Sticky embed \`${name}\` sent to ${channel}.`,
        ephemeral: true,
      });
    }

    // DELETE
    if (sub === "delete") {
      const name = interaction.options.getString("name");
      const deleted = await StickyEmbed.findOneAndDelete({
        guildId: interaction.guildId,
        name,
      });
      if (!deleted)
        return interaction.reply({
          content: "Sticky embed not found.",
          ephemeral: true,
        });
      return interaction.reply({
        content: `Sticky embed \`${name}\` deleted.`,
        ephemeral: true,
      });
    }

    // LIST
    if (sub === "list") {
      const stickies = await StickyEmbed.find({ guildId: interaction.guildId });

      if (!stickies.length) {
        return interaction.reply({
          content: "No sticky embeds found in this server.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("Sticky Embeds")
        .setDescription(
          stickies
            .map(
              (sticky) =>
                `• **${sticky.name}**${
                  sticky.embed.description
                    ? ` — ${sticky.embed.description.substring(0, 60)}${
                        sticky.embed.description.length > 60 ? "..." : ""
                      }`
                    : ""
                } *(Assigned to ${sticky.stickies?.length || 0} channel${
                  (sticky.stickies?.length || 0) !== 1 ? "s" : ""
                })*`
            )
            .join("\n")
        )
        .setColor("#5865F2");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
