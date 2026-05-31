// BackEnd/Model/CartModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    category: String,
    img: String,
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    discountType: {
      type: String,
      enum: ["none", "percentage", "fixed"],
      default: "none",
    },
    discountValue: { type: Number, default: 0, min: 0 },

    // Start at 20 and never go below 20
    reorderLevel: { type: Number, default: 20, min: 20 },
  },
  { timestamps: true, versionKey: false }
);

module.exports =
  mongoose.models.CartProduct ||
  mongoose.model("CartProduct", productSchema, "products");
