// models/AttendanceModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MODEL_NAME = "Attendance";
const COLLECTION = "attendance";

const attendanceSchema = new Schema(
  {
    empId:        { type: String, required: true, trim: true }, // must match Finance.EmpId
    period:       { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // YYYY-MM
    workingDays:  { type: Number, default: 0, min: 0, max: 31 },
    overtimeHrs:  { type: Number, default: 0, min: 0 },
    leaveAllowed: { type: Number, default: 0, min: 0 },
    noPayLeave:   { type: Number, default: 0, min: 0 },
    leaveTaken:   { type: Number, default: 0, min: 0 },
    other:        { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

attendanceSchema.index({ empId: 1, period: 1 }, { unique: true });

module.exports =
  mongoose.models[MODEL_NAME] ||
  mongoose.model(MODEL_NAME, attendanceSchema, COLLECTION);
