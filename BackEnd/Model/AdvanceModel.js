// models/AdvanceModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MODEL = "Advance";
const COLLECTION = "advances";

const advanceSchema = new Schema(
  {
    empId: { type: String, required: true, trim: true }, // Finance.EmpId
    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/, // YYYY-MM
    },

    // Allowances
    costOfLiving: { type: Number, default: 0, min: 0 },
    medical: { type: Number, default: 0, min: 0 },
    conveyance: { type: Number, default: 0, min: 0 },

    // Bonuses (UI uses Performance + Attendance)
    bonus: { type: Number, default: 0, min: 0 },        // Performance
    attendance: { type: Number, default: 0, min: 0 },   // NEW

    // Kept for compatibility, not shown in the new UI
    food: { type: Number, default: 0, min: 0 },
    reimbursements: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

// One record per employee per month
advanceSchema.index({ empId: 1, period: 1 }, { unique: true });

module.exports =
  mongoose.models[MODEL] || mongoose.model(MODEL, advanceSchema, COLLECTION);
