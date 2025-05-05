const BuddyReadAnnouncement = require('../models/BuddyReadAnnouncement');
const BuddyReadSession = require('../models/BuddyReadSession');

// === Embed Editor Imports ===
const EmbedModel = require('../models/Embed');
const { sendEmbedEditor, buildEmbed } = require('../utils/embedEditorUI');
const { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

function normalizeBookTitle(book) {
  return book.trim().toLowerCase();
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // --- BUTTON HANDLERS ---
    if (interaction.isButton()) {

      // ======================
      // BUDDYREAD ANNOUNCEMENT DELETE BUTTON HANDLER (add here!)
      // ======================
      if (interaction.customId.startsWith('buddyread_announcement_delete_')) {
        const announcementId = interaction.customId.replace('buddyread_announcement_delete_', '');
        const announcement = await BuddyReadAnnouncement.findById(announcementId);
        if (!announcement) {
          return interaction.reply({ content: 'Announcement not found or already deleted.', ephemeral: false });
        }
        if (announcement.userId !== interaction.user.id) {
          return interaction.reply({ content: 'You can only delete your own announcements!', ephemeral: false });
        }
        await BuddyReadAnnouncement.deleteOne({ _id: announcementId });
        return interaction.reply({ content: '<a:noyes1:1339800615622152237> Your announcement has been deleted.', ephemeral: false });
      }

      // --- BuddyRead Connect Button (full session logic) ---
      if (interaction.customId.startsWith('buddyread_connect_')) {
        const announcerUserId = interaction.customId.replace('buddyread_connect_', '');
        const connector = interaction.user;
        const serverId = interaction.guild?.id || null;

        if (announcerUserId === connector.id) {
          return interaction.reply({ content: "You can't connect with yourself.", ephemeral: false });
        }

        // Find the announcement in MongoDB
        const announcement = await BuddyReadAnnouncement.findOne({ userId: announcerUserId });
        if (!announcement) {
          return interaction.reply({ content: "That announcement no longer exists.", ephemeral: false });
        }

        // --- Normalize book title for matching ---
        const normalizedBook = normalizeBookTitle(announcement.book);

        // Check for existing active session between these two users for this book (normalized)
        const existingSession = await BuddyReadSession.findOne({
          book_normalized: normalizedBook,
          'participants.userId': { $all: [announcerUserId, connector.id] },
          status: 'active'
        });

        if (existingSession) {
          return interaction.reply({ content: "There is already an active buddy read session between you and this user for this book.", ephemeral: false });
        }

        // --- Save normalized book title in session (add a new field) ---
        const session = new BuddyReadSession({
          book: announcement.book,
          book_normalized: normalizedBook, // new normalized field
          audience: announcement.audience,
          participants: [
            { userId: announcerUserId, username: announcement.username },
            { userId: connector.id, username: connector.tag }
          ],
          serverId: announcement.serverId,
          status: 'active'
        });
        await session.save();

        // Optionally, delete the announcement so user can't be matched again for this book
        await BuddyReadAnnouncement.deleteOne({ _id: announcement._id });

        // DM both users
        const announcerUser = await interaction.client.users.fetch(announcerUserId).catch(() => null);
        try {
          if (announcerUser) {
            await announcerUser.send(
              `<:zboke:1368357746595991616> You have been matched for a buddy read!\n\n**Book:** ${announcement.book}\n**With:** ${connector.tag}\n**Audience:** ${announcement.audience}${announcement.note ? `\n**Note:** ${announcement.note}` : ''}`
            );
          }
          await connector.send(
            `<a:zpopz:1366768293368827964> You have started a buddy read session!\n\n**Book:** ${announcement.book}\n**With:** ${announcement.username}\n**Audience:** ${announcement.audience}${announcement.note ? `\n**Note:** ${announcement.note}` : ''}`
          );
        } catch (e) {
          // Ignore DM failures
        }

        // Confirm to the connector
        await interaction.reply({
          content: `You are now matched with **${announcement.username}** for **${announcement.book}**!`,
          ephemeral: false
        });
        return;
      }

      // ======================
      // EMBED EDITOR BUTTON HANDLER (NEW!)
      // ======================
      const [prefix, action, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && action === 'edit') {
        // Fetch embed from DB
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.', ephemeral: false });

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
                  .setLabel('Hex Color (e.g. #5865F2)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.color || '#5865F2')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'author') {
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

      // --- Example: Other Button Handlers ---
      // Add more button handlers below as needed, for example:
      /*
      if (interaction.customId.startsWith('reminder_complete_')) {
        // Your reminder button logic here
        return;
      }
      */

      // --- End Button Handlers ---
    }

    // ======================
    // EMBED EDITOR MODAL HANDLER (NEW!)
    // ======================
    if (interaction.isModalSubmit()) {
      const [prefix, type, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && type === 'modal') {
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.', ephemeral: false });

		function emptyToNull(str) {
			return (typeof str === 'string' && str.trim() === '') ? null : str;
		  }
		  
		  if (section === 'basic') {
			doc.title = emptyToNull(interaction.fields.getTextInputValue('title'));
			doc.description = emptyToNull(interaction.fields.getTextInputValue('description'));
			doc.color = emptyToNull(interaction.fields.getTextInputValue('color')) || '#5865F2';
		  }
		  
		  if (section === 'author') {
			doc.author.name = emptyToNull(interaction.fields.getTextInputValue('author_name'));
			doc.author.icon_url = emptyToNull(interaction.fields.getTextInputValue('author_icon'));
		  }
		  
		  if (section === 'footer') {
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
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: false });
      }
    }
  }
};