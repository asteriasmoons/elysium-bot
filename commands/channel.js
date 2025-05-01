const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const configPath = './sprint-config.json';

function saveChannel(guildId, channelId) {
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  config[guildId] = channelId;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function resetChannel(guildId) {
  if (!fs.existsSync(configPath)) return;
  let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  delete config[guildId];
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Set, view, or reset the designated sprint channel')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the current channel as the sprint channel')
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View the current sprint channel')
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset (clear) the designated sprint channel')
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;

    if (interaction.options.getSubcommand() === 'set') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Permission')
              .setDescription('Only admins can set the sprint channel.')
              .setColor('#4ac4d7')
          ],
        });
      }
      saveChannel(guildId, channelId);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Channel Set')
            .setDescription(`This channel has been set as the sprint channel!`)
            .setColor('#4ac4d7')
        ]
      });
    }

    if (interaction.options.getSubcommand() === 'view') {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      if (config[guildId]) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Sprint Channel')
              .setDescription(`The current sprint channel is <#${config[guildId]}>`)
              .setColor('#4ac4d7')
          ]
        });
      } else {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Channel Set')
              .setDescription('No sprint channel has been set yet!')
              .setColor('#4ac4d7')
          ]
        });
      }
    }

    if (interaction.options.getSubcommand() === 'reset') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('No Permission')
              .setDescription('Only admins can reset the sprint channel.')
              .setColor('#4ac4d7')
          ],
        });
      }
      resetChannel(guildId);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Sprint Channel Reset')
            .setDescription('Sprint channel setting has been cleared. Sprint messages will now go to the command channel.')
            .setColor('#4ac4d7')
        ]
      });
    }
  }
};