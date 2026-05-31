// models/Contribution.js (same as before)
const mongoose = require("mongoose");
const { Schema } = mongoose;

const contributionSchema = new Schema({
  period:      { type: String, required: true, unique: true }, // "2025-02"
  periodLabel: { type: String, required: true },               // "February 2025"
  dueDate:     { type: Date, required: true },                 // e.g. 15th next month
  status:      { type: String, enum: ["Pending","Paid","Upcoming"], default: "Pending" },

  baseTotal: { type: Number, default: 0 },
  epfEmp:    { type: Number, default: 0 },  // 8%
  epfEr:     { type: Number, default: 0 },  // 12%
  etf:       { type: Number, default: 0 },  // 3%
  total:     { type: Number, default: 0 },  // epfEmp + epfEr + etf

  paidAt:    { type: Date },
  paymentRef:{ type: String },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Contribution", contributionSchema, "contributions");
