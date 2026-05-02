const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ModerationConfig = require("../models/ModerationConfig");

const DURATION_MAP = {
  "10m": 10 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modconfig")
    .setDescription("Configure the moderation system")
    .addSubcommand((sub) =>
      sub
        .setName("set-log-channel")
        .setDescription("Set the channel for mod log embeds")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Mod log channel").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-appeal-channel")
        .setDescription("Set the channel where appeal submissions are posted")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Appeal channel").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-warn-threshold")
        .setDescription("Set an automatic escalation at a warn count")
        .addIntegerOption((o) =>
          o.setName("count").setDescription("Number of warns to trigger at").setRequired(true).setMinValue(1)
        )
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("Action to take")
            .setRequired(true)
            .addChoices(
              { name: "Timeout", value: "timeout" },
              { name: "Ban", value: "ban" }
            )
        )
        .addStringOption((o) =>
          o
            .setName("duration")
            .setDescription("Timeout duration (required if action is timeout)")
            .setRequired(false)
            .addChoices(
              { name: "10 minutes", value: "10m" },
              { name: "30 minutes", value: "30m" },
              { name: "1 hour", value: "1h" },
              { name: "6 hours", value: "6h" },
              { name: "12 hours", value: "12h" },
              { name: "1 day", value: "1d" },
              { name: "3 days", value: "3d" },
              { name: "7 days", value: "7d" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the current moderation configuration")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "set-log-channel") {
      const channel = interaction.options.getChannel("channel");
      await ModerationConfig.findOneAndUpdate(
        { guildId },
        { modLogChannelId: channel.id },
        { upsert: true }
      );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Mod Log Channel Set")
            .setDescription(`Mod actions will now be logged to <#${channel.id}>.`),
        ],
      });
    }

    if (sub === "set-appeal-channel") {
      const channel = interaction.options.getChannel("channel");
      await ModerationConfig.findOneAndUpdate(
        { guildId },
        { appealChannelId: channel.id },
        { upsert: true }
      );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Appeal Channel Set")
            .setDescription(`Appeal submissions will now be posted to <#${channel.id}>.`),
        ],
      });
    }

    if (sub === "set-warn-threshold") {
      const count = interaction.options.getInteger("count");
      const action = interaction.options.getString("action");
      const durationKey = interaction.options.getString("duration");

      if (action === "timeout" && !durationKey)
        return interaction.editReply({ content: "A duration is required when the action is timeout." });

      const duration = durationKey ? DURATION_MAP[durationKey] : null;

      const config = await ModerationConfig.findOneAndUpdate(
        { guildId },
        {},
        { upsert: true, new: true }
      );

      // Replace existing threshold at this count or add new one
      const existing = config.warnThresholds.findIndex((t) => t.count === count);
      if (existing !== -1) {
        config.warnThresholds[existing] = { count, action, duration };
      } else {
        config.warnThresholds.push({ count, action, duration });
      }
      config.warnThresholds.sort((a, b) => a.count - b.count);
      await config.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Warn Threshold Set")
            .setDescription(
              `At **${count} warnings**, the bot will automatically **${action}**${durationKey ? ` for ${durationKey}` : ""}.`
            ),
        ],
      });
    }

    if (sub === "view") {
      const config = await ModerationConfig.findOne({ guildId });

      const thresholds = config?.warnThresholds?.length
        ? config.warnThresholds
            .sort((a, b) => a.count - b.count)
            .map((t) => {
              const dur = t.duration
                ? ` (${Math.floor(t.duration / 3600000)}h)`
                : "";
              return `• **${t.count} warns** → ${t.action}${dur}`;
            })
            .join("\n")
        : "None configured";

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Moderation Configuration")
        .addFields(
          {
            name: "Mod Log Channel",
            value: config?.modLogChannelId ? `<#${config.modLogChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Appeal Channel",
            value: config?.appealChannelId ? `<#${config.appealChannelId}>` : "Not set",
            inline: true,
          },
          { name: "Warn Thresholds", value: thresholds },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
