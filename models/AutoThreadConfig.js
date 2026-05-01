// models/AutoThreadConfig.js
const mongoose = require("mongoose");

/**
 * Schema for the per-channel embed configuration
 * - title:    The title of the embed sent in the thread (optional)
 * - description: The body/description of the embed (optional)
 * - color:    The color of the embed in HEX (optional, defaults to Discord blurple)
 */
const EmbedConfigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "", // If no title is set, leave blank
    },
    description: {
      type: String,
      default: "", // If no description is set, leave blank
    },
    color: {
      type: String,
      default: "#5865F2", // Discord's blurple color as fallback
    },
  },
  { _id: false }
); // _id: false so these aren't separate subdocs in Mongo

/**
 * Schema for the per-channel configuration object
 * - channelId:          The ID of the channel being configured for auto-threading
 * - embed:              The embed config for the thread created in this channel
 * - threadNameTemplate: Optional template string for thread names (e.g. "Thread for {user}")
 */
const ChannelConfigSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: true, // Every channel config must specify a channel ID
    },
    embed: {
      type: EmbedConfigSchema,
      default: () => ({}), // By default, use blank embed config (will fallback to default values)
    },
    threadNameTemplate: {
      type: String,
      default: "Thread for {user}", // Default thread naming template
      // You can use {user} and {message} as variables in the template (see implementation)
    },
  },
  { _id: false }
); // Prevents Mongoose from creating _id for array subdocs

/**
 * Main schema for AutoThread configuration per guild
 * - guildId:   Discord Guild (Server) ID — unique per server
 * - channels:  Array of per-channel config objects (see above)
 * - archivedChannels: Stores config for channels that were previously set up but are now disabled.
 *     - When a channel is removed from auto-threading, its config is moved here instead of being deleted.
 *     - If that channel is re-added, its settings (embed, template) are restored from this array.
 *
 * This schema will ensure:
 *   - Only one config document per guild (unique index on guildId)
 *   - Up to 10 channels can be configured per guild (enforce in command logic, not schema)
 *   - Each channel config can have a custom embed and thread name
 *   - archivedChannels prevents accidental loss of user settings for removed channels
 */
const AutoThreadConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true, // Only ONE config doc per guild/server!
    index: true, // Makes querying by guildId efficient
  },
  channels: {
    type: [ChannelConfigSchema],
    default: [], // No channels configured by default
    // Enforce 10 max in your code/commands!
  },
  archivedChannels: {
    type: [ChannelConfigSchema],
    default: [], // No archived configs by default
    // When a channel is "removed" by the user, we move its config here instead of deleting it.
    // If the user re-adds a channel, its config is restored from here.
  },
});

// Export the schema as a Mongoose model
module.exports = mongoose.model("AutoThreadConfig", AutoThreadConfigSchema);
