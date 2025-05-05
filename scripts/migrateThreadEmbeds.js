// scripts/migrateThreadEmbeds.js
const mongoose = require('mongoose');
const ThreadEmbed = require('../models/ThreadEmbed');
const fs = require('fs');
const path = require('path');

const EMBED_CONFIG_PATH = path.join(__dirname, '..', 'thread_embeds.json');
const config = JSON.parse(fs.readFileSync(EMBED_CONFIG_PATH));

async function migrate() {
  await mongoose.connect('mongodb://localhost:27017/buddyread-bot'); // update as needed

  for (const channelId in config) {
    const embed = config[channelId];
    await ThreadEmbed.updateOne(
      { channelId },
      { ...embed, channelId },
      { upsert: true }
    );
  }

  console.log('Migration complete!');
  process.exit();
}

migrate();