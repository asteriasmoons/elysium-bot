// models/Autorole.js
const mongoose = require("mongoose");

const AutoroleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  roleIds: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Autorole", AutoroleSchema);
