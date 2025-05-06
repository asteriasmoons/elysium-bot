// models/Counter.js
const { Schema, model } = require('mongoose');

const counterSchema = new Schema({
  _id: { type: String, required: true }, // e.g., "report"
  seq: { type: Number, default: 0 }
});

module.exports = model('Counter', counterSchema);