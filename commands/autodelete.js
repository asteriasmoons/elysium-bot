// commands/autodelete.js

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const AutoDeleteChannel = require('../models/AutoDeleteChannel');

module.exports = {
  // 1. Define the slash command with subcommands
  data: new SlashCommandBuilder()
    .setName('autodelete')
    .setDescription('Configure automatic message deletion for a channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // --- /autodelete set <channel> [delay] ---
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Enable autodelete in a channel')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel to enable autodelete')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('delay')
            .setDescription('Seconds before deleting messages (default: 10)')
            .setMinValue(5)
            .setMaxValue(300)
        )
    )
    // --- /autodelete remove <channel> ---
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Disable autodelete in a channel')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel to disable autodelete')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // --- /autodelete list ---
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List channels with autodelete enabled')
    ),

  // 2. Command handler
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // === Enable autodelete ===
    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const delay = interaction.options.getInteger('delay') ?? 10;

      await AutoDeleteChannel.findOneAndUpdate(
        { guildId, channelId: channel.id },
        { $set: { guildId, channelId: channel.id, delaySeconds: delay } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setTitle('Autodelete Enabled')
        .setDescription(`Messages in <#${channel.id}> will now be deleted automatically after **${delay} seconds**.`)
        .setColor('#35009a')
        .setFooter({ text: 'Pandoryx Autodelete System' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // === Disable autodelete ===
    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      await AutoDeleteChannel.findOneAndDelete({ guildId, channelId: channel.id });

      const embed = new EmbedBuilder()
        .setTitle('Autodelete Disabled')
        .setDescription(`Messages in <#${channel.id}> will no longer be deleted automatically.`)
        .setColor('#35009a')
        .setFooter({ text: 'Pandoryx Autodelete System' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // === List autodelete channels ===
    if (sub === 'list') {
      const configs = await AutoDeleteChannel.find({ guildId });
      let embed;

      if (!configs.length) {
        embed = new EmbedBuilder()
          .setTitle('No Autodelete Channels')
          .setDescription('No channels currently have autodelete enabled.')
          .setColor('#35009a')
          .setFooter({ text: 'Pandoryx Autodelete System' });
      } else {
        const list = configs
          .map(c => `• <#${c.channelId}> — \`${c.delaySeconds ?? 10}s\``)
          .join('\n');

        embed = new EmbedBuilder()
          .setTitle('Autodelete Enabled Channels')
          .setDescription(list)
          .setColor('#35009a')
          .setFooter({ text: 'Pandoryx Autodelete System' });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};