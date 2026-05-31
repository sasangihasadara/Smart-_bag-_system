const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    category: String,            // e.g., "bag"
    img: String,                 // data URL or http URL
    price: Number,               // maps to unitPrice in UI
    stock: Number,
    rating: Number,
    discountType: String,        // "percentage" | "amount" | etc.
    discountValue: Number,
  },
  { timestamps: true }           // createdAt / updatedAt
);

module.exports = mongoose.model("Product", ProductSchema, "products");
// ^ collection name = products (as in your screenshot)