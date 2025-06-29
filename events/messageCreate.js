// events/messageCreate.js
const { EmbedBuilder } = require("discord.js");
const BuddyReadSession = require("../models/BuddyReadSession");
const BuddyReadMessage = require("../models/BuddyReadMessage");
const ThreadEmbed = require("../models/ThreadEmbed");

// List of allowed channel IDs (edit these!)
const ALLOWED_CHANNELS = [
  "1337159554248609833", // Wellness
  "1358072745664970875", // Book Cafe
];

// Default embed templates for known channels
const DEFAULT_EMBEDS = {
  "1337159554248609833": {
    title: "Welcome to the Wellness Thread!",
    description:
      "This is your safe space to share, support, and grow together. 🌱\n\nFeel free to talk about your wellness journey, ask for advice, or just check in.",
    color: 0x43b581,
  },
  "1358072745664970875": {
    title: "Book Cafe Discussion",
    description:
      "Welcome to your Book Cafe thread! ☕📚\n\nShare your thoughts about the book, post reading updates, or discuss your favorite characters here.",
    color: 0xfaa61a,
  },
};

module.exports = {
  name: "messageCreate",
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // --- DM RELAY LOGIC FOR BUDDYREADS ---
    if (!message.guild) {
      // Only handle DMs for BuddyRead relay
      // Find active buddyread sessions where this user is a participant
      const sessions = await BuddyReadSession.find({
        status: "active",
        "participants.userId": message.author.id,
      });

      if (!sessions.length) return; // Not in any active session, ignore

      // If user is in more than one session, prompt them to specify
      if (sessions.length > 1) {
        let reply =
          "You are in multiple active buddyread sessions. Please specify which book to send your message to by replying with the book title.\n\n";
        reply += sessions.map((s, i) => `**${i + 1}.** ${s.book}`).join("\n");
        reply += "\n\nExample: `The Hobbit`";
        await message.author.send(reply);

        // Wait for their next message (simple version)
        const filter = (m) => m.author.id === message.author.id;
        try {
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ["time"],
          });
          const response = collected.first().content.trim();
          const session = sessions.find(
            (s) => s.book.toLowerCase() === response.toLowerCase()
          );
          if (!session) {
            return message.author.send(
              "No session found with that book title. Please try again."
            );
          }
          // Relay the original message (not the book title reply)
          return relayMessage(session, message, message.content);
        } catch (err) {
          return message.author.send("Timed out. Please try again.");
        }
      } else {
        // Only in one session, relay directly
        return relayMessage(sessions[0], message, message.content);
      }
    }

    // --- GUILD MESSAGE LOGIC (THREAD + EMBED) ---
    if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;

    // Fetch or create embed config from MongoDB
    let embedData = await ThreadEmbed.findOne({
      channelId: message.channel.id,
    });

    if (!embedData) {
      // Use a default if available, otherwise a generic fallback
      const def = DEFAULT_EMBEDS[message.channel.id] || {
        title: "Thread",
        description: "Welcome to your new thread!",
        color: 0x5865f2,
      };

      embedData = await ThreadEmbed.create({
        channelId: message.channel.id,
        ...def,
      });
    }

    // Create thread from the message
    let thread;
    try {
      thread = await message.startThread({
        name: message.content.slice(0, 100) || "Thread",
        autoArchiveDuration: 1440, // 24h
      });
    } catch (e) {
      console.error("Failed to create thread:", e);
      return;
    }

    // Send embed in the thread
    try {
      const embed = new EmbedBuilder({
        title: embedData.title,
        description: embedData.description,
        color: embedData.color,
      });
      await thread.send({ embeds: [embed] });
    } catch (e) {
      console.error("Failed to send embed in thread:", e);
    }
  },
};

// Helper function to relay the message
async function relayMessage(session, message, originalMessage) {
  const senderId = message.author.id;
  const sender = message.author;
  const otherParticipant = session.participants.find(
    (p) => p.userId !== senderId
  );

  // Save the message to the database (for /buddyread messages)
  try {
    await BuddyReadMessage.create({
      sessionId: session._id,
      senderId,
      senderTag: sender.tag,
      content: originalMessage,
      sentAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to save buddyread message:", err);
  }

  // Fetch the other participant's user object and relay the message
  try {
    const user = await message.client.users.fetch(otherParticipant.userId);
    await user.send(
      `<:pcbuk:1368854535220494367> **BuddyRead Message** (${session.book})\n**From ${sender.tag}:**\n${originalMessage}`
    );
    await sender.send("Your message has been sent to your buddyread partner!");
  } catch (e) {
    await sender.send(
      "Sorry, I could not deliver your message (maybe their DMs are closed)."
    );
  }
}
