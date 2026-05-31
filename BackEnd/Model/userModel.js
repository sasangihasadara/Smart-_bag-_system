// BackEnd/Model/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Security best practice: don't return password by default
    password:  { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: [
        "Inventory Manager",
        "Finance Manager",
        "Product Manager",
        "Cart Manager",
        "User Manager",
        "customer",
        "admin",
        "staff",
      ],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked", "pending", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
