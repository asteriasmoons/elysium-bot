// models/UserInventory.js
const mongoose = require("mongoose");

const UserInventorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
      quantity: { type: Number, default: 1 },
    },
  ],
});

module.exports = mongoose.model("UserInventory", UserInventorySchema);
