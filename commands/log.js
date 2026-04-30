const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const LogConfig = require("../models/LogConfig");

const LOG_EVENT_OPTIONS = [
  { label: "Member Join", value: "memberJoin" },
  { label: "Member Leave", value: "memberLeave" },
  { label: "Message Deleted", value: "messageDelete" },
  { label: "Message Edited", value: "messageEdit" },
  { label: "Bulk Delete", value: "bulkDelete" },
  { label: "Nickname Changed", value: "nicknameChange" },
  { label: "Avatar Changed", value: "avatarChange" },
  { label: "Channel Created", value: "channelCreate" },
  { label: "Channel Updated", value: "channelUpdate" },
  { label: "Channel Deleted", value: "channelDelete" },
  { label: "Role Create", value: "roleCreate" },
  { label: "Role Updated", value: "roleUpdate" },
  { label: "Role Delete", value: "roleDelete" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Configure or view logging")
    .addSubcommand((sub) =>
      sub.setName("config").setDescription("Configure event log destinations.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View current logging channel settings.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Disable logging for one or more events.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // === /log config ===
    if (sub === "config") {
      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId("selectLogEvent")
        .setPlaceholder("Select one or more events to configure")
        .setMinValues(1)
        .setMaxValues(LOG_EVENT_OPTIONS.length)
        .addOptions(LOG_EVENT_OPTIONS);

      const row = new ActionRowBuilder().addComponents(eventSelect);

      const selectEmbed = new EmbedBuilder()
        .setTitle("Logging Configuration")
        .setDescription(
          "Select one or more events below, then choose a channel to log them all to."
        )
        .setColor(0x5865f2)
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      await interaction.reply({
        embeds: [selectEmbed],
        components: [row],
        ephemeral: true,
      });
    }

    // === /log view ===
    if (sub === "view") {
      const config = await LogConfig.findOne({ guildId: interaction.guild.id });
      const embed = new EmbedBuilder()
        .setTitle("Logging Configuration")
        .setColor(0x5865f2)
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      if (!config || !config.logs || Object.keys(config.logs).length === 0) {
        embed.setDescription(
          "No logging channels have been configured yet. Use `/log config` to get started."
        );
      } else {
        const formatted = Object.entries(config.logs).map(
          ([key, channelId]) => {
            const label = key
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return `• **${label}** → <#${channelId}>`;
          }
        );
        embed.setDescription(formatted.join("\n"));
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // === /log disable ===
    if (sub === "disable") {
      const disableSelect = new StringSelectMenuBuilder()
        .setCustomId("disableLogEvent")
        .setPlaceholder("Select one or more events to disable")
        .setMinValues(1)
        .setMaxValues(LOG_EVENT_OPTIONS.length)
        .addOptions(LOG_EVENT_OPTIONS);

      const row = new ActionRowBuilder().addComponents(disableSelect);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Disable Logging Events")
            .setDescription(
              "Select one or more events to disable logging for.\n\nYou can re-enable them at any time using `/log config`."
            )
            .setColor(0xed4245),
        ],
        components: [row],
        ephemeral: true,
      });
    }
  },
};
