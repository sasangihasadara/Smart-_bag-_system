// routes/AttendanceRoute.js
const express = require("express");
const {
  getAllAttendance,
  addAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
} = require("../Controllers/AttendanceController");

const router = express.Router();

// Optional seed
router.post("/test-create", async (_req, res, next) => {
  try {
    const Attendance = require("../Model/AttendanceModel");
    const r = await Attendance.create({
      empId: "EMP001",
      period: "2025-08",
      workingDays: 22,
      overtimeHrs: 10,
      leaveAllowed: 2,
      noPayLeave: 0,
      leaveTaken: 1,
      other: "Seeded via /attendance/test-create",
    });
    res.status(201).json({ _id: r._id, attendance: r });
  } catch (e) { next(e); }
});

router.get("/", getAllAttendance);
router.post("/", addAttendance);
router.get("/:id", getAttendanceById);
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

module.exports = router;
