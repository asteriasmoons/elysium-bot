const JournalEntry = require('../models/JournalEntry');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const User = require('../models/User');
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { DateTime } = require('luxon');
const index = require('../index');
const EmbedModel = require('../models/Embed');
const { buildEmbed } = require('../utils/embedEditorUI');
const TBR = require('../models/TBR');
const { scheduleHabitReminder } = require('../habitScheduler');

const customEmoji = '<a:twrly3:1369321311423434946>';
const BOOKS_PER_PAGE = 4; // Should match your tbr.js setting

function paginateBooks(books, page) {
  const start = (page - 1) * BOOKS_PER_PAGE;
  const end = start + BOOKS_PER_PAGE;
  return books.slice(start, end);
}

function buildTbrEmbed(user, books, page, totalPages, customEmoji) {
  const paginated = paginateBooks(books, page);

  const description = paginated.map((b, i) => {
    let statusText = b.status === 'finished' ? 'Finished'
      : b.status === 'dnf' ? 'Did Not Finish'
      : 'To Be Read';
    return `${customEmoji} ${(i + 1) + (BOOKS_PER_PAGE * (page - 1))}. **${b.title}**\n**Author:** *${b.author}*\n**Status:** ${statusText}`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setTitle(`${user.username}'s TBR List`)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(description || 'No books on this page.')
    .setFooter({ text: `Page ${page} of ${totalPages}` })
    .setColor('#ff95f2');
}

function buildActionRow(page, totalPages, targetUserId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`tbr_prev_${targetUserId}_${page}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`tbr_next_${targetUserId}_${page}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages)
    );
}

function normalizeBookTitle(book) {
  return book.trim().toLowerCase();
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // --- BUTTON HANDLERS ---
    if (interaction.isButton()) {
      // --- TBR PAGINATION BUTTON HANDLER ---
      if (interaction.customId.startsWith('tbr_prev_') || interaction.customId.startsWith('tbr_next_')) {
        // customId format: tbr_prev_<userId>_<page> or tbr_next_<userId>_<page>
        const [, action, userId, pageStr] = interaction.customId.split('_');
        const oldPage = parseInt(pageStr, 10);
        const newPage = action === 'prev' ? oldPage - 1 : oldPage + 1;

        // Only allow the command invoker to paginate their own list
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "You can't turn pages on someone else's TBR list!", ephemeral: true });
        }

        // Fetch the user and their TBR
        const targetUser = await interaction.client.users.fetch(userId);
        let tbr = await TBR.findOne({ userId });
        if (!tbr) tbr = new TBR({ userId, books: [] });

        console.log('oldPage:', oldPage, 'newPage:', newPage);
        console.log('Total books:', tbr.books.length);
        console.log('Books on this page:', paginateBooks(tbr.books, newPage));


        const totalPages = Math.ceil(tbr.books.length / BOOKS_PER_PAGE);

        // Safety check: Don't go out of bounds
        if (newPage < 1 || newPage > totalPages) {
          return interaction.deferUpdate(); // Do nothing
        }

        // Build the new embed and buttons
        const embed = buildTbrEmbed(targetUser, tbr.books, newPage, totalPages, customEmoji);
        const row = buildActionRow(newPage, totalPages, userId);

        // Edit the original message
        return interaction.update({
          embeds: [embed],
          components: [row]
        });
      }

      // --- JOURNAL PAGINATION BUTTON HANDLER ---
      if (interaction.customId.startsWith('journal_')) {
        const ENTRIES_PER_PAGE = 3;
        const [prefix, direction, pageStr] = interaction.customId.split('_');
        let page = parseInt(pageStr, 10);
        if (isNaN(page) || page < 1) page = 1;
        const userId = interaction.user.id;

        // Only allow the original user to paginate their own journal list
        if (
          interaction.message.interaction?.user?.id &&
          interaction.message.interaction.user.id !== userId
        ) {
          return interaction.reply({
            content: "You can't use these buttons.",
            ephemeral: true
          });
        }

        // Fetch entries
        const entries = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
        const totalEntries = entries.length;
        const totalPages = Math.max(1, Math.ceil(totalEntries / ENTRIES_PER_PAGE));
        if (page > totalPages) page = totalPages;
        const noEntries = totalEntries === 0;

        const start = (page - 1) * ENTRIES_PER_PAGE;
        const pageEntries = entries.slice(start, start + ENTRIES_PER_PAGE);

        const embed = new EmbedBuilder()
        .setTitle(`<:xbuuke:1369320075126898748> Your Journal Entries (Page ${page}/${totalPages})`)
        .setColor(0x9370db)
        .setDescription(pageEntries.length
      ? pageEntries.map((e, i) =>
          `**${start + i + 1}.** [${new Date(e.createdAt).toLocaleDateString()}] ${e.entry.slice(0, 35)}`
        ).join('\n')
      : 'No entries found.'
      );


        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`journal_previous_${Math.max(page - 1, 1)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1368587424556646420')
            .setDisabled(page === 1 || noEntries),
          new ButtonBuilder()
            .setCustomId(`journal_next_${Math.min(page + 1, totalPages)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1368587337646211082')
            .setDisabled(page === totalPages || noEntries)
        );

        return interaction.update({
          embeds: [embed],
          components: [row]
        });
      }

      // --- HABIT BUTTONS ---
      if (interaction.customId && interaction.customId.startsWith('habit_dm_')) {
        // Example: habit_dm_123456789_yes
        const [ , , habitId, action ] = interaction.customId.split('_');

        let embed;
        let xpToAdd = 0;

        // Respond based on action
        if (action === 'yes') {
          embed = new EmbedBuilder().setDescription('Marked as done for today! Good job!');
          xpToAdd = 10;
        } else if (action === 'nottoday') {
          embed = new EmbedBuilder().setDescription('Marked for not today. That\'s okay. Try again tomorrow!');
          xpToAdd = 2;
        } else if (action === 'skip') {
          embed = new EmbedBuilder().setDescription('Marked as skipped today. That\'s perfectly fine. You can always try again tomorrow.');
          xpToAdd = 0;
        } else {
          await interaction.reply({ content: 'Unknown action.', ephemeral: false });
          return;
        }

        // Save a log for each action, with the correct XP
        try {
          await HabitLog.create({
            userId: interaction.user.id,
            habitId: habitId,
            action: action,
            timestamp: new Date(),
            xp: xpToAdd,
          });
        } catch (error) {
          console.error('Failed to save HabitLog:', error);
          await interaction.reply({ content: 'Failed to log your habit. Please try again.', ephemeral: false });
          return;
        }

        // Award XP to the user
        if (xpToAdd !== 0) {
          await User.updateOne(
            { discordId: interaction.user.id },
            { $inc: { xp: xpToAdd } },
            { upsert: true }
          );
        }

        // Optionally, you can show the user how much XP they earned
        embed.setFooter({ text: `+${xpToAdd} XP` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // --- HABIT FREQUENCY BUTTONS ---
      if (interaction.customId === 'habit_frequency_daily' || interaction.customId === 'habit_frequency_weekly') {
        const frequency = interaction.customId === 'habit_frequency_daily' ? 'daily' : 'weekly';

        const modal = new ModalBuilder()
          .setCustomId(`habit_modal_create_${frequency}`)
          .setTitle('Set Up Your Habit')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('habit_name')
                .setLabel('Habit Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('habit_description')
                .setLabel('Description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('habit_hour')
                .setLabel('Hour (0-23)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('habit_minute')
                .setLabel('Minute (0-59)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );

        return interaction.showModal(modal);
      }

      // --- EMBED EDITOR BUTTON HANDLER ---
      const [prefix, action, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && action === 'edit') {
        // Fetch embed from DB
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.' });

        // Show modal for the relevant section
        if (section === 'basic') {
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_basic_${embedId}`)
            .setTitle('Edit Basic Info')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('title')
                  .setLabel('Title')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.title || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('description')
                  .setLabel('Description')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(false)
                  .setValue(doc.description || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('color')
                  .setLabel('Hex Color (e.g. #993377)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.color || '#993377')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'author') {
          if (!doc.author) doc.author = {};
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_author_${embedId}`)
            .setTitle('Edit Author')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('author_name')
                  .setLabel('Author Name')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.author?.name || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('author_icon')
                  .setLabel('Author Icon URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.author?.icon_url || '')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'footer') {
          if (!doc.footer) doc.footer = {};
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_footer_${embedId}`)
            .setTitle('Edit Footer')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_text')
                  .setLabel('Footer Text')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.text || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_icon')
                  .setLabel('Footer Icon URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.icon_url || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_timestamp')
                  .setLabel('Add Timestamp? (yes/no)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.timestamp ? 'yes' : 'no')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'images') {
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_images_${embedId}`)
            .setTitle('Edit Images')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('thumbnail')
                  .setLabel('Thumbnail URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.thumbnail || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('image')
                  .setLabel('Main Image URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.image || '')
              )
            );
          return interaction.showModal(modal);
        }
        return; // prevent fallthrough
      }
      // --- End Button Handlers ---
    }

    // ====== HABIT MODAL HANDLER ======
    if (interaction.isModalSubmit()) {
      // Habit Modal
      if (interaction.customId.startsWith('habit_modal_create_')) {
        const frequency = interaction.customId.split('_').pop(); // 'daily' or 'weekly'
        const userId = interaction.user.id;
        const name = interaction.fields.getTextInputValue('habit_name');
        const description = interaction.fields.getTextInputValue('habit_description');
        const hour = parseInt(interaction.fields.getTextInputValue('habit_hour'), 10);
        const minute = parseInt(interaction.fields.getTextInputValue('habit_minute'), 10);

        // Save Habit to DB
        const habitId = `${userId}-${Date.now()}`;
        let habit;
        try {
          habit = await Habit.create({
            _id: habitId, // custom string ID!
            userId,
            name,
            description,
            frequency,
            hour,
            minute
          });
          scheduleHabitReminder(client, habit);
          console.log('Created habit:', habit);
        } catch (error) {
          console.error('Failed to create habit:', error);
          await interaction.reply({ content: 'Failed to create habit. Please try again.', ephemeral: false });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('Habit Created!')
          .setDescription(`Habit "**${name}**" created! You'll get **${frequency}** reminders at **${hour}:${minute.toString().padStart(2, '0')}**.`)
          .setColor(0x663399);

        return interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      }

      // --- EMBED EDITOR MODAL HANDLER ---
      const [prefix, type, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && type === 'modal') {
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.' });

        function emptyToNull(str) {
          return (typeof str === 'string' && str.trim() === '') ? null : str;
        }

        if (section === 'basic') {
          doc.title = emptyToNull(interaction.fields.getTextInputValue('title'));
          doc.description = emptyToNull(interaction.fields.getTextInputValue('description'));
          doc.color = emptyToNull(interaction.fields.getTextInputValue('color')) || '#993377';
        }

        if (section === 'author') {
          if (!doc.author) doc.author = {};
          doc.author.name = emptyToNull(interaction.fields.getTextInputValue('author_name'));
          doc.author.icon_url = emptyToNull(interaction.fields.getTextInputValue('author_icon'));
        }

        if (section === 'footer') {
          if (!doc.footer) doc.footer = {};
          doc.footer.text = emptyToNull(interaction.fields.getTextInputValue('footer_text'));
          doc.footer.icon_url = emptyToNull(interaction.fields.getTextInputValue('footer_icon'));
          const timestampInput = interaction.fields.getTextInputValue('footer_timestamp').toLowerCase();
          doc.footer.timestamp = timestampInput === 'yes' || timestampInput === 'true';
        }

        if (section === 'images') {
          doc.thumbnail = emptyToNull(interaction.fields.getTextInputValue('thumbnail'));
          doc.image = emptyToNull(interaction.fields.getTextInputValue('image'));
        }

        await doc.save();

        // Edit the original reply with the updated embed and buttons
        return interaction.update({
          content: `**Editing Embed:** \`${doc.name}\` (updated!)`,
          embeds: [buildEmbed(doc)],
          components: [
            new ActionRowBuilder().addComponents(
              ...[
                { label: 'Edit Basic Info', id: 'basic', style: 'Secondary' },
                { label: 'Edit Author', id: 'author', style: 'Secondary' },
                { label: 'Edit Footer', id: 'footer', style: 'Secondary' },
                { label: 'Edit Images', id: 'images', style: 'Secondary' }
              ].map(btn =>
                new ButtonBuilder()
                  .setCustomId(`embed_edit_${btn.id}_${doc._id}`)
                  .setLabel(btn.label)
                  .setStyle(ButtonStyle[btn.style])
              )
            )
          ]
        });
      }
    }

    // --- SLASH COMMAND HANDLER ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        // Prevent double reply/edit and avoid "Unknown interaction" error
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'There was an error executing this command!' });
          } else {
            await interaction.reply({ content: 'There was an error executing this command!' });
          }
        } catch (err) {
          // If the interaction is already expired, just log the error.
          console.error('Failed to reply to interaction:', err);
        }
      }
    }
  }
};