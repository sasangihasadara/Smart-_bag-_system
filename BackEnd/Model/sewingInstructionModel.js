const mongoose = require("mongoose");
const { Schema } = mongoose;

const sewingInstructionSchema = new Schema(
  {
    bag:      { type: String, required: true, trim: true },
    details:  { type: String, default: "", trim: true },
    person:   { type: String, required: true, trim: true },
    deadline: { type: Date,   required: true },

    priority: { type: String, enum: ["High", "Medium", "Low"], default: "High" },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Quality Check", "Done", "Failed"],
      default: "In Progress",
    },

    // QC metadata (optional)
    qcDate: { type: Date },
    qcNote: { type: String, trim: true },
    qcBy:   { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

sewingInstructionSchema.index({ status: 1, deadline: 1 });
sewingInstructionSchema.index({ createdAt: -1 });

//exports model name "SewingInstruction"
module.exports = mongoose.model("SewingInstruction", sewingInstructionSchema, "sewing_instructions");
