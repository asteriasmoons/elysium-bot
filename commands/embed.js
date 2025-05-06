// commands/embed.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedModel = require('../models/Embed');
const { sendEmbedEditor, buildEmbed } = require('../utils/embedEditorUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create, edit, send, view, list, or delete server embeds')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new named embed')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name of the embed')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an existing named embed')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name of the embed')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete an existing embed')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name of the embed to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('send')
        .setDescription('Send an existing embed to this channel')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name of the embed to send')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View an existing embed privately')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name of the embed to view')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all embeds created for this server')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // /embed list handler
    if (sub === 'list') {
      const embeds = await EmbedModel.find({ guildId: interaction.guild.id });
      if (!embeds.length) {
        return interaction.reply({
          embeds: [{
            title: 'Server Embeds',
            description: 'No embeds found for this server.',
            color: 0x993377
          }]
        });
      }

      const embedList = embeds.map(e => `• \`${e.name}\``).join('\n');
      return interaction.reply({
        embeds: [{
          title: 'Server Embeds',
          description: embedList,
          color: 0x993377
        }]
      });
    }

    // All other subcommands use 'name'
    const name = interaction.options.getString('name')?.toLowerCase();

    if (sub === 'create') {
      const exists = await EmbedModel.findOne({ guildId, name });
      if (exists) {
        return interaction.reply({ content: `<a:zpyesno1:1368590377887469598> An embed named \`${name}\` already exists.`, ephemeral: false });
      }

      const embedDoc = await EmbedModel.create({ guildId, name, creatorId: userId });
      return sendEmbedEditor(interaction, embedDoc, true);
    }

    if (sub === 'edit') {
      const embedDoc = await EmbedModel.findOne({ guildId, name });
      if (!embedDoc) {
        return interaction.reply({ content: `<a:zpyesno1:1368590377887469598> No embed named \`${name}\` found.`, ephemeral: false });
      }

      return sendEmbedEditor(interaction, embedDoc, false);
    }

    if (sub === 'delete') {
      const deletedEmbed = await EmbedModel.findOneAndDelete({ guildId, name });
      if (!deletedEmbed) {
        return interaction.reply({ content: `<a:zpyesno1:1368590377887469598> No embed found named \`${name}\`.`, ephemeral: false });
      }

      return interaction.reply({ content: `<a:zpyesno2:1368590432488915075> Embed \`${name}\` successfully deleted.` });
    }

    if (sub === 'send') {
      const embedDoc = await EmbedModel.findOne({ guildId, name });
      if (!embedDoc) {
        return interaction.reply({ content: `<a:zpyesno1:1368590377887469598> No embed named \`${name}\` found.`, ephemeral: false });
      }

      const embed = buildEmbed(embedDoc);
      return interaction.channel.send({ embeds: [embed] })
        .then(() => interaction.reply({ content: `<a:zpyesno2:1368590432488915075> Embed \`${name}\` sent successfully.`, ephemeral: false }))
        .catch(err => {
          console.error(err);
          interaction.reply({ content: `<a:zpyesno1:1368590377887469598> Failed to send embed \`${name}\`.`, ephemeral: false });
        });
    }

    if (sub === 'view') {
      const embedDoc = await EmbedModel.findOne({ guildId, name });
      if (!embedDoc) {
        return interaction.reply({ content: `<a:zpyesno1:1368590377887469598> No embed named \`${name}\` found.`, ephemeral: false });
      }

      const embed = buildEmbed(embedDoc);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};