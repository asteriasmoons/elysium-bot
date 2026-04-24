const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const RolePanel = require("../models/RolePanel"); // Adjust path as needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolepanel")
    .setDescription("Create and manage role menus (buttons or selects)")
    // CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new role menu panel")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Unique panel name")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type of menu (button or select)")
            .setRequired(true)
            .addChoices(
              { name: "Button Menu", value: "button" },
              { name: "Select Menu", value: "select" }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName("select_mode")
            .setDescription("(Select menu only) Single or multi-select?")
            .addChoices(
              { name: "Single", value: "single" },
              { name: "Multi", value: "multi" }
            )
        )
    )
    // ADDROLE
    .addSubcommand((sub) =>
      sub
        .setName("addrole")
        .setDescription("Add a role option to a panel")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Panel name").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to add").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("label")
            .setDescription("Button/option label")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription("Emoji for this role (optional)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Option description (select menu only, optional)")
            .setRequired(false)
        )
    )
    // PUBLISH
    .addSubcommand((sub) =>
      sub
        .setName("publish")
        .setDescription("Publish a panel to a channel")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Panel name").setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to publish in")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // EDITEMBED
    .addSubcommand((sub) =>
      sub
        .setName("editembed")
        .setDescription("Edit the embed content of a role panel")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Panel name").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Embed title").setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Embed description")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("color")
            .setDescription("Hex color (e.g. #00bfff)")
            .setRequired(false)
        )
    )
    // LIST
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all role panels in this server")
    )
    // DELETE
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete a role panel")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Panel name").setRequired(true)
        )
    ),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content:
          "You need the **Manage Roles** permission to use this command.",
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    // ---- CREATE ----
    if (sub === "create") {
      const name = interaction.options.getString("name").trim();
      const type = interaction.options.getString("type");
      const selectMode =
        interaction.options.getString("select_mode") ||
        (type === "select" ? "multi" : undefined);

      // Only allow one panel of this name per guild
      const exists = await RolePanel.findOne({
        guildId: interaction.guild.id,
        panelName: name,
      });
      if (exists) {
        return interaction.reply({
          content: `A panel named \`${name}\` already exists in this server.`,
          ephemeral: true,
        });
      }

      await RolePanel.create({
        guildId: interaction.guild.id,
        panelName: name,
        type,
        selectMode,
        roles: [],
        // Add default values for embed fields
        embedTitle: "",
        embedDescription: "",
        embedColor: "#00e6e6",
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Role Panel Created")
            .setDescription(
              `Panel: \`${name}\` (${type}${
                type === "select" ? `, ${selectMode}-select` : ""
              }) created!\nUse \`/rolepanel addrole\` to add roles, then \`/rolepanel publish\` to post.`
            )
            .setColor(0x00e6e6),
        ],
        ephemeral: true,
      });
    }

    // ---- ADDROLE ----
    if (sub === "addrole") {
      const name = interaction.options.getString("name").trim();
      const role = interaction.options.getRole("role");
      const label = interaction.options.getString("label").trim();
      const emoji = interaction.options.getString("emoji");
      const description = interaction.options.getString("description");

      const panel = await RolePanel.findOne({
        guildId: interaction.guild.id,
        panelName: name,
      });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` exists in this server.`,
          ephemeral: true,
        });
      }

      // Prevent duplicate roles in this panel
      if (panel.roles.find((r) => r.roleId === role.id)) {
        return interaction.reply({
          content: `Role <@&${role.id}> is already in the panel.`,
          ephemeral: true,
        });
      }

      // Add to roles array
      panel.roles.push({
        roleId: role.id,
        label,
        emoji,
        description,
        order: panel.roles.length, // append at end
      });
      await panel.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Role Added")
            .setDescription(
              `Added ${emoji ? `${emoji} ` : ""}<@&${
                role.id
              }> as **${label}** to panel \`${name}\``
            )
            .setColor(0x00e6e6),
        ],
        ephemeral: true,
      });
    }

    // ---- PUBLISH ----
    if (sub === "publish") {
      const name = interaction.options.getString("name").trim();
      const channel = interaction.options.getChannel("channel");

      const panel = await RolePanel.findOne({
        guildId: interaction.guild.id,
        panelName: name,
      });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` exists in this server.`,
          ephemeral: true,
        });
      }
      if (panel.roles.length === 0) {
        return interaction.reply({
          content: `Panel \`${name}\` has no roles added yet!`,
          ephemeral: true,
        });
      }

      // Compose the embed using custom fields or fallback defaults
      const embed = new EmbedBuilder()
        .setTitle(panel.embedTitle || panel.panelName)
        .setDescription(panel.embedDescription || "Select your roles below:")
        .setColor(panel.embedColor || "#00e6e6");

      // === COMPONENTS ===
      let components = [];

      if (panel.type === "button") {
        const {
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
        } = require("discord.js");
        const rows = [];
        for (let i = 0; i < panel.roles.length; i += 5) {
          const actionRow = new ActionRowBuilder();
          actionRow.addComponents(
            ...panel.roles.slice(i, i + 5).map((roleOpt) =>
              new ButtonBuilder()
                .setCustomId(`rolepanel_button_${panel._id}_${roleOpt.roleId}`)
                .setLabel(roleOpt.label)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(roleOpt.emoji || undefined)
            )
          );
          rows.push(actionRow);
        }
        components = rows;
      }

      if (panel.type === "select") {
        const {
          ActionRowBuilder,
          StringSelectMenuBuilder,
        } = require("discord.js");
        const select = new StringSelectMenuBuilder()
          .setCustomId(`rolepanel_select_${panel._id}`)
          .setPlaceholder("Choose your roles")
          .setMinValues(0)
          .setMaxValues(panel.selectMode === "multi" ? panel.roles.length : 1)
          .addOptions(
            panel.roles.map((roleOpt) => ({
              label: roleOpt.label,
              value: roleOpt.roleId,
              emoji: roleOpt.emoji || undefined,
              description: roleOpt.description || undefined,
            }))
          );
        components = [new ActionRowBuilder().addComponents(select)];
      }

      // Send the menu embed and save message/channel id
      const message = await channel.send({ embeds: [embed], components });

      panel.channelId = channel.id;
      panel.messageId = message.id;
      await panel.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Panel Published")
            .setDescription(
              `Panel \`${name}\` published in ${channel}. Users can now assign/remove roles by interacting!`
            )
            .setColor(0x00e6e6),
        ],
        ephemeral: true,
      });
    }

    // ---- LIST ----
    if (sub === "list") {
      const panels = await RolePanel.find({ guildId: interaction.guild.id });
      if (!panels.length) {
        return interaction.reply({
          content: "No role panels found in this server.",
          ephemeral: true,
        });
      }
      const embed = new EmbedBuilder()
        .setTitle("Role Panels")
        .setColor(0x00e6e6);

      for (const panel of panels) {
        embed.addFields({
          name: `${panel.panelName} (${panel.type}${
            panel.type === "select" ? `, ${panel.selectMode}-select` : ""
          })`,
          value: panel.roles.length
            ? panel.roles
                .map(
                  (r) =>
                    `${r.emoji ? `${r.emoji} ` : ""}**${r.label}** (<@&${
                      r.roleId
                    }>)`
                )
                .join("\n")
            : "_No roles added yet._",
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ---- DELETE ----
    if (sub === "delete") {
      const name = interaction.options.getString("name").trim();
      const panel = await RolePanel.findOne({
        guildId: interaction.guild.id,
        panelName: name,
      });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` exists in this server.`,
          ephemeral: true,
        });
      }

      // Try to delete the old menu message
      if (panel.channelId && panel.messageId) {
        const channel = await client.channels
          .fetch(panel.channelId)
          .catch(() => null);
        if (channel) {
          const msg = await channel.messages
            .fetch(panel.messageId)
            .catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      }

      await RolePanel.deleteOne({ _id: panel._id });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Panel Deleted")
            .setDescription(`Panel \`${name}\` has been deleted.`)
            .setColor(0x00e6e6),
        ],
        ephemeral: true,
      });
    }

    // ---- EDITEMBED ----
    if (sub === "editembed") {
      const name = interaction.options.getString("name").trim();
      const panel = await RolePanel.findOne({
        guildId: interaction.guild.id,
        panelName: name,
      });
      if (!panel) {
        return interaction.reply({
          content: `No panel named \`${name}\` exists in this server.`,
          ephemeral: true,
        });
      }

      // Set new embed values (only if provided)
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color");

      if (title !== null) panel.embedTitle = title;
      if (description !== null) panel.embedDescription = description;
      if (color !== null) panel.embedColor = color;

      await panel.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Panel Embed Updated")
            .setDescription(
              `Panel \`${name}\` embed updated!\n` +
                `${title !== null ? `**Title:** ${title}\n` : ""}` +
                `${
                  description !== null
                    ? `**Description:** ${description}\n`
                    : ""
                }` +
                `${color !== null ? `**Color:** ${color}\n` : ""}`
            )
            .setColor(color || panel.embedColor || 0x00e6e6),
        ],
        ephemeral: true,
      });
    }
  },
};
