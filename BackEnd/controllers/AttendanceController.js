// controllers/AttendanceController.js
const mongoose = require("mongoose");
const Attendance = require("../Model/AttendanceModel");
const Finance = require("../Model/FinanceSalaryModel");

// GET /attendance  (use ?includeEmployee=1 to join Finance for names/designations)
// GET /attendance
async function getAllAttendance(req, res) {
  try {
    if (req.query.includeEmployee === "1") {
      const docs = await Attendance.aggregate([
        { $sort: { createdAt: 1 } },   // 👈 oldest -> newest
        {
          $lookup: {
            from: "financesalarymodels",
            localField: "empId",
            foreignField: "EmpId",
            as: "employee",
          },
        },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            empId: 1, period: 1, workingDays: 1, overtimeHrs: 1,
            leaveAllowed: 1, noPayLeave: 1, leaveTaken: 1,
            other: 1, createdAt: 1,
            employeeName: "$employee.Emp_Name",
            designation: "$employee.Designation",
          },
        },
      ]);
      return res.status(200).json({ attendance: docs });
    }

    const docs = await Attendance
      .find()
      .sort({ createdAt: 1 })   // 👈 oldest -> newest
      .lean()
      .exec();

    res.status(200).json({ attendance: docs });
  } catch (err) {
    console.error("[attendance:getAll]", err);
    res.status(500).json({ message: "Error fetching attendance records" });
  }
}

// POST /attendance
async function addAttendance(req, res) {
  try {
    const {
      empId, period, workingDays, overtimeHrs,
      leaveAllowed, noPayLeave, leaveTaken, other
    } = req.body;

    if (!empId || !period) {
      return res.status(400).json({ message: "empId and period are required (YYYY-MM)" });
    }

    // ensure employee exists (empId must match Finance.EmpId)
    const employee = await Finance.findOne({ EmpId: empId }).lean().exec();
    if (!employee) return res.status(400).json({ message: "Employee not found (invalid EmpId)" });

    const exists = await Attendance.findOne({ empId, period }).lean().exec();
    if (exists) return res.status(409).json({ message: "Attendance for this employee and period already exists" });

    const doc = await Attendance.create({
      empId, period,
      workingDays, overtimeHrs, leaveAllowed, noPayLeave, leaveTaken, other
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Attendance for this employee and period already exists" });
    }
    if (err?.name === "ValidationError") {
      const details = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: details || "Validation error" });
    }
    console.error("[attendance:add]", err);
    res.status(500).json({ message: "Error adding attendance record" });
  }
}

// GET /attendance/:id
async function getAttendanceById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id format" });
    const doc = await Attendance.findById(id).lean().exec();
    if (!doc) return res.status(404).json({ message: "Attendance record not found" });
    res.status(200).json(doc);
  } catch (err) {
    console.error("[attendance:getById]", err);
    res.status(500).json({ message: "Server error" });
  }
}

// PUT /attendance/:id
async function updateAttendance(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id format" });

    const allowed = ["empId","period","workingDays","overtimeHrs","leaveAllowed","noPayLeave","leaveTaken","other"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    if ("empId" in updates) {
      const employee = await Finance.findOne({ EmpId: updates.empId }).lean().exec();
      if (!employee) return res.status(400).json({ message: "Employee not found (invalid EmpId)" });
    }

    const updated = await Attendance.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) return res.status(404).json({ message: "Attendance record not found" });
    res.status(200).json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Attendance for this employee and period already exists" });
    }
    if (err?.name === "ValidationError") {
      const details = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: details || "Validation error" });
    }
    console.error("[attendance:update]", err);
    res.status(500).json({ message: "Server error while updating attendance" });
  }
}

// DELETE /attendance/:id
async function deleteAttendance(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id format" });

    const deleted = await Attendance.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ message: "Attendance record not found" });

    res.status(200).json({ message: "Attendance deleted successfully" });
  } catch (err) {
    console.error("[attendance:delete]", err);
    res.status(500).json({ message: "Unable to delete attendance" });
  }
}

module.exports = {
  getAllAttendance,
  addAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
};
