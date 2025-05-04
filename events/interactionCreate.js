const BuddyReadAnnouncement = require('../models/BuddyReadAnnouncement');
const BuddyReadSession = require('../models/BuddyReadSession');

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

    // --- SLASH COMMAND HANDLER ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
      }
    }
  }
};