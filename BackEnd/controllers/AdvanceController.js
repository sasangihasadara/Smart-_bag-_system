// Controllers/AdvanceController.js
const mongoose = require("mongoose");
const Advance = require("../Model/AdvanceModel");
const Finance = require("../Model/FinanceSalaryModel");

/* ----------------------------- helpers ----------------------------- */

// yyyy-mm for "now"
function currentPeriod() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

// strip commas/currency and keep digits, minus, and dot
function toNumberSafe(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* ----------------------------- handlers ----------------------------- */

// GET /advance  (?includeEmployee=1 to join employee data)
async function getAllAdvance(req, res) {
  try {
    const sortStage = { $sort: { createdAt: 1 } }; // oldest -> newest (new rows at bottom)

    if (req.query.includeEmployee === "1") {
      const docs = await Advance.aggregate([
        sortStage,
        {
          $lookup: {
            from: "financesalarymodels", // collection of FinanceSalary
            localField: "empId",
            foreignField: "EmpId",
            as: "employee",
          },
        },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            empId: 1,
            period: 1,
            costOfLiving: 1,
            medical: 1,
            conveyance: 1,
            bonus: 1,          // <-- include bonus for "Performance"
            attendance: 1,
            createdAt: 1,
            employeeName: "$employee.Emp_Name",
          },
        },
      ]);
      return res.status(200).json({ advances: docs });
    }

    const docs = await Advance.find().sort({ createdAt: 1 }).lean().exec();
    return res.status(200).json({ advances: docs });
  } catch (err) {
    console.error("[advance:getAll]", err);
    return res.status(500).json({ message: "Error fetching advances" });
  }
}

// POST /advance  (manual add)
async function addAdvance(req, res) {
  try {
    const {
      empId,
      period,
      costOfLiving = 0,
      food = 0,
      conveyance = 0,
      medical = 0,
      bonus = 0,
      reimbursements = 0,
      attendance = 0,
    } = req.body;

    if (!empId || !period) {
      return res.status(400).json({ message: "empId and period are required (YYYY-MM)" });
    }

    // Validate employee exists
    const employee = await Finance.findOne({ EmpId: empId }).lean().exec();
    if (!employee) {
      return res.status(400).json({ message: "Employee not found (invalid EmpId)" });
    }

    // Ensure one record per (empId, period)
    const exists = await Advance.findOne({ empId, period }).lean().exec();
    if (exists) {
      return res
        .status(409)
        .json({ message: "Advance for this employee and period already exists" });
    }

    const doc = await Advance.create({
      empId,
      period,
      costOfLiving: toNumberSafe(costOfLiving),
      food: toNumberSafe(food),
      conveyance: toNumberSafe(conveyance),
      medical: toNumberSafe(medical),
      bonus: toNumberSafe(bonus),
      reimbursements: toNumberSafe(reimbursements),
      attendance: toNumberSafe(attendance),
    });

    return res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Advance for this employee and period already exists" });
    }
    if (err?.name === "ValidationError") {
      const details = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: details || "Validation error" });
    }
    console.error("[advance:add]", err);
    return res.status(500).json({ message: "Error adding advance record" });
  }
}

// POST /advance/compute  (auto-calc by EmpId)
async function computeAndCreateAdvance(req, res) {
  try {
    const empId = String(req.body.empId || "").trim();
    const period = req.body.period || currentPeriod();
    if (!empId) return res.status(400).json({ message: "empId is required" });

    // Find employee and basic salary (prefer Base_Sal)
    const employee = await Finance.findOne({ EmpId: empId }).lean().exec();
    if (!employee) return res.status(400).json({ message: "Employee not found (invalid EmpId)" });

    const rawBasic =
      employee.Base_Sal ??
      employee.Basic_Salary ??
      employee.baseSalary ??
      employee.Base_Salary ??
      0;

    const basic = toNumberSafe(rawBasic); // sanitize

    // Enforce uniqueness per (empId, period)
    const exists = await Advance.findOne({ empId, period }).lean().exec();
    if (exists) {
      return res.status(409).json({ message: "Advance for this employee and period already exists" });
    }

    // Compute & create
    const doc = await Advance.create({
      empId,
      period,
      costOfLiving: Math.round(basic * 0.40),
      medical:      Math.round(basic * 0.10),
      conveyance:   Math.round(basic * 0.15),
      bonus:        Math.round(basic * 0.20), // performance
      attendance:   Math.round(basic * 0.05),
      // legacy fields (kept for compatibility)
      food: 0,
      reimbursements: 0,
    });

    return res.status(201).json({
      ...doc.toObject(),
      employeeName: employee.Emp_Name,
      _computedFromBasic: Math.round(basic),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Advance for this employee and period already exists" });
    }
    console.error("[advance:compute]", err);
    return res.status(500).json({ message: "Error computing advance" });
  }
}

// GET /advance/:id
async function getAdvanceById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id format" });
    }
    const doc = await Advance.findById(id).lean().exec();
    if (!doc) return res.status(404).json({ message: "Advance record not found" });
    return res.status(200).json(doc);
  } catch (err) {
    console.error("[advance:getById]", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PUT /advance/:id
async function updateAdvance(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id format" });
    }

    const allowed = [
      "empId", "period",
      "costOfLiving", "food", "conveyance",
      "medical", "bonus", "reimbursements", "attendance",
    ];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) {
        // sanitize numbers
        if (["costOfLiving","food","conveyance","medical","bonus","reimbursements","attendance"].includes(k)) {
          updates[k] = toNumberSafe(req.body[k]);
        } else {
          updates[k] = req.body[k];
        }
      }
    }

    // validate employee if empId changes
    if ("empId" in updates) {
      const employee = await Finance.findOne({ EmpId: updates.empId }).lean().exec();
      if (!employee) return res.status(400).json({ message: "Employee not found (invalid EmpId)" });
    }

    const updated = await Advance.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) return res.status(404).json({ message: "Advance record not found" });
    return res.status(200).json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Advance for this employee and period already exists" });
    }
    if (err?.name === "ValidationError") {
      const details = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: details || "Validation error" });
    }
    console.error("[advance:update]", err);
    return res.status(500).json({ message: "Server error while updating advance" });
  }
}

// DELETE /advance/:id
async function deleteAdvance(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id format" });
    }
    const deleted = await Advance.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ message: "Advance record not found" });
    return res.status(200).json({ message: "Advance deleted successfully" });
  } catch (err) {
    console.error("[advance:delete]", err);
    return res.status(500).json({ message: "Unable to delete advance" });
  }
}

module.exports = {
  getAllAdvance,
  addAdvance,
  computeAndCreateAdvance,
  getAdvanceById,
  updateAdvance,
  deleteAdvance,
};
