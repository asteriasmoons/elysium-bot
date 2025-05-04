// events/messageCreate.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const BuddyReadSession = require('../models/BuddyReadSession');
// ADD THIS LINE (for logging messages later)
const BuddyReadMessage = require('../models/BuddyReadMessage'); // <-- add this model soon!

// List of allowed channel IDs (edit these!)
const ALLOWED_CHANNELS = [
  '1337159554248609833', // <--- Replace with your channel IDs
  '1358072745664970875'
];

// Path to the embed config file (edit path if needed)
const EMBED_CONFIG_PATH = path.join(__dirname, '..', 'thread_embeds.json');

function loadEmbedConfig() {
  if (!fs.existsSync(EMBED_CONFIG_PATH)) fs.writeFileSync(EMBED_CONFIG_PATH, '{}');
  return JSON.parse(fs.readFileSync(EMBED_CONFIG_PATH));
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // --- DM RELAY LOGIC FOR BUDDYREADS ---
    if (!message.guild) {
      // Only handle DMs for BuddyRead relay
      // Find active buddyread sessions where this user is a participant
      const sessions = await BuddyReadSession.find({
        status: 'active',
        'participants.userId': message.author.id
      });

      if (!sessions.length) return; // Not in any active session, ignore

      // If user is in more than one session, prompt them to specify
      if (sessions.length > 1) {
        let reply = 'You are in multiple active buddyread sessions. Please specify which book to send your message to by replying with the book title.\n\n';
        reply += sessions.map((s, i) => `**${i + 1}.** ${s.book}`).join('\n');
        reply += '\n\nExample: `The Hobbit`';
        await message.author.send(reply);

        // Wait for their next message (simple version)
        const filter = m => m.author.id === message.author.id;
        try {
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
          const response = collected.first().content.trim();
          const session = sessions.find(s => s.book.toLowerCase() === response.toLowerCase());
          if (!session) {
            return message.author.send('No session found with that book title. Please try again.');
          }
          // Relay the original message (not the book title reply)
          return relayMessage(session, message, message.content);
        } catch (err) {
          return message.author.send('Timed out. Please try again.');
        }
      } else {
        // Only in one session, relay directly
        return relayMessage(sessions[0], message, message.content);
      }
    }

    // --- GUILD MESSAGE LOGIC (THREAD + EMBED) ---
    if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;

    const config = loadEmbedConfig();
    const embedData = config[message.channel.id];
    if (!embedData) return; // No embed set for this channel

    // Create thread from the message
    let thread;
    try {
      thread = await message.startThread({
        name: message.content.slice(0, 100) || 'Thread',
        autoArchiveDuration: 1440 // 24h
      });
    } catch (e) {
      console.error('Failed to create thread:', e);
      return;
    }

    // Send embed in the thread
    try {
      const embed = new EmbedBuilder(embedData);
      await thread.send({ embeds: [embed] });
    } catch (e) {
      console.error('Failed to send embed in thread:', e);
    }
  }
};

// Helper function to relay the message
async function relayMessage(session, message, originalMessage) {
  const senderId = message.author.id;
  const sender = message.author;
  const otherParticipant = session.participants.find(p => p.userId !== senderId);

  // Save the message to the database (for /buddyread messages)
  // You will need to create the BuddyReadMessage model for this to work!
  try {
    await BuddyReadMessage.create({
      sessionId: session._id,
      senderId,
      senderTag: sender.tag,
      content: originalMessage,
      sentAt: new Date()
    });
  } catch (err) {
    console.error('Failed to save buddyread message:', err);
  }

  // Fetch the other participant's user object and relay the message
  try {
    const user = await message.client.users.fetch(otherParticipant.userId);
    await user.send(
      `📚 **BuddyRead Message** (${session.book})\n**From ${sender.tag}:**\n${originalMessage}`
    );
    await sender.send('Your message has been sent to your buddyread partner!');
  } catch (e) {
    await sender.send('Sorry, I could not deliver your message (maybe their DMs are closed).');
  }
}