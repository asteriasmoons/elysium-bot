const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const JournalEntry = require('../models/JournalEntry');

const ENTRIES_PER_PAGE = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('journal')
    .setDescription('Manage your journal entries')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a new journal entry')
        .addStringOption(opt => opt.setName('entry').setDescription('Your journal text').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List your journal entries')
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number'))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View a specific journal entry')
        .addIntegerOption(opt => opt.setName('number').setDescription('Entry number (from /journal list)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit a journal entry')
        .addIntegerOption(opt => opt.setName('number').setDescription('Entry number (from /journal list)').setRequired(true))
        .addStringOption(opt => opt.setName('entry').setDescription('New journal text').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a journal entry')
        .addIntegerOption(opt => opt.setName('number').setDescription('Entry number (from /journal list)').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'add') {
      const entry = interaction.options.getString('entry');
      await JournalEntry.create({ userId, entry });
      const count = await JournalEntry.countDocuments({ userId });
      const embed = new EmbedBuilder()
        .setTitle('<a:zpyesno2:1368590432488915075> Entry Added')
        .setDescription(`Your entry has been saved! You now have **${count}** entries.`)
        .setColor(0x9370db);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'list') {
      let page = interaction.options.getInteger('page') || 1;
      if (page < 1) page = 1;
      const entries = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
      const totalEntries = entries.length;
      const totalPages = Math.max(1, Math.ceil(totalEntries / ENTRIES_PER_PAGE));
      if (page > totalPages) page = totalPages;

      const start = (page - 1) * ENTRIES_PER_PAGE;
      const pageEntries = entries.slice(start, start + ENTRIES_PER_PAGE);

      const embed = new EmbedBuilder()
        .setTitle(`<:xbuuke:1369320075126898748> Journal Entries (Page ${page}/${totalPages})`)
        .setColor(0x9370db)
        .setDescription(
          pageEntries.length
            ? pageEntries.map((e, i) =>
                `**${start + i + 1}.** [${e.createdAt.toLocaleDateString()}] ${e.entry.slice(0, 35)}`
              ).join('\n')
            : 'No entries found.'
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`journal_previous_${page - 1}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1368587424556646420')
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`journal_next_${page + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1368587337646211082')
          .setDisabled(page === totalPages)
      );

      // Try to DM the user
      try {
        await interaction.user.send({ embeds: [embed], components: [row] });
        return interaction.reply({
			embeds: [
				new EmbedBuilder()
				.setDescription('<:xmail:1368803966304911371> Your journal entries have been sent to your DMs!')
				.setColor(0x9370db)
			],
          ephemeral: false
        });
      } catch (e) {
        return interaction.reply({
			embeds: [
				new EmbedBuilder()
				.setDescription('<a:zpyesno1:1368590377887469598> I could not send you a DM. Please check your privacy settings.')
				.setColor(0x9370db)
			],
          ephemeral: false
        });
      }
    }

    if (sub === 'view') {
      const number = interaction.options.getInteger('number');
      const entries = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
      if (number < 1 || number > entries.length) {
		return interaction.reply({
			embeds: [
			  new EmbedBuilder()
                .setDescription('Invalid entry number.')
				.setColor (0x9370db)
		   ],
		   ephemeral: false
		});
      }
      const entry = entries[number - 1];
      const embed = new EmbedBuilder()
        .setTitle(`<a:xspncl:1368617574002069605> Entry #${number}`)
        .setDescription(entry.entry)
        .setFooter({ text: `Created at: ${entry.createdAt.toLocaleString()}` })
        .setColor(0x9370db);

		try {
			await interaction.user.send({ embeds: [embed] });
			return interaction.reply({
			  embeds: [
				new EmbedBuilder()
				  .setDescription(`<:xmail:1368803966304911371> Entry #${number} has been sent to your DMs!`)
				  .setColor(0x9370db)
			  ],
			  ephemeral: false
			});
		  } catch (e) {
			return interaction.reply({
			  embeds: [
				new EmbedBuilder()
				  .setDescription('<a:zpyesno1:1368590377887469598> I could not send you a DM. Please check your privacy settings.')
				  .setColor(0x9370db)
			  ],
			  ephemeral: false
			});
		  }		  
    }

    if (sub === 'edit') {
      const number = interaction.options.getInteger('number');
      const newText = interaction.options.getString('entry');
      const entries = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
      if (number < 1 || number > entries.length) {
        return interaction.reply({ content: 'Invalid entry number.', ephemeral: false });
      }
      const entry = entries[number - 1];
      entry.entry = newText;
      await entry.save();
      const embed = new EmbedBuilder()
        .setTitle(`<a:xspncl:1368617574002069605> Entry #${number} Edited`)
        .setDescription(newText)
        .setFooter({ text: `Edited at: ${new Date().toLocaleString()}` })
        .setColor(0x9370db);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'delete') {
      const number = interaction.options.getInteger('number');
      const entries = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
      if (number < 1 || number > entries.length) {
        return interaction.reply({ content: 'Invalid entry number.', ephemeral: false });
      }
      const entry = entries[number - 1];
      await entry.deleteOne();
      const embed = new EmbedBuilder()
        .setTitle(`<a:zpyesno2:1368590432488915075> Entry #${number} Deleted`)
        .setDescription('Your entry has been deleted.')
        .setColor(0x9370db);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};