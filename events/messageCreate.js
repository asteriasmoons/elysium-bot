// events/messageCreate.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// List of allowed channel IDs (edit these!)
const ALLOWED_CHANNELS = [
  '1345768724099235910', // <--- Replace with your channel IDs
  '1308081246831771730'
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
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;
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