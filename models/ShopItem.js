// models/ShopItem.js
const mongoose = require("mongoose");

const ShopItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: null }, // null = unlimited
  // emoji: { type: String, default: '' } // optional, for display
});

module.exports = mongoose.model("ShopItem", ShopItemSchema);
