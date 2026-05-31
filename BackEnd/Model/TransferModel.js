const mongoose = require("mongoose");
const { Schema } = mongoose;

const transferSchema = new Schema({
  empId:   { type: String, required: true },
  month:   { type: String, required: true }, // e.g. "September 2025"
  date:    { type: String, required: true }, // "YYYY-MM-DD"
  empName: { type: String, required: true },
  amount:  { type: Number, required: true, min: 0 },
  // keep "Paid" to match UI wording
  status:  { type: String, default: "Pending", enum: ["Pending", "Paid", "Failed"] },
}, { timestamps: true, versionKey: false });

transferSchema.index({ empId: 1, month: 1 }, { unique: true });

module.exports = mongoose.models.Transfer
  || mongoose.model("Transfer", transferSchema, "transfers");