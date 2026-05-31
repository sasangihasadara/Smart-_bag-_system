// routes/contributions.js
const express = require("express");
const Contribution = require("../Model/Contribution");
const Finance = require("../Model/FinanceSalaryModel"); // your existing model
const { monthLabel, dueDateNextMonth15, round } = require("../lib/contrib");

const router = express.Router();

// ---- A. SUMMARY for Cards (reads Finance -> computes EPF/ETF) ----
// GET /contributions/summary?period=YYYY-MM
router.get("/summary", async (req, res) => {
  try {
    const period = req.query.period || new Date().toISOString().slice(0,7); // "YYYY-MM"
    const label  = monthLabel(period);
    const due    = dueDateNextMonth15(period);

    // 1) Sum Base_Sal from Finance (all active employees)
    const emps = await Finance.find({}, { Base_Sal: 1 }).lean();
    const baseTotal = emps.reduce((s, e) => s + Number(e.Base_Sal || 0), 0);

    // 2) Rates
    const epfEmp = round(baseTotal * 0.08);
    const epfEr  = round(baseTotal * 0.12);
    const epfTotal = epfEmp + epfEr;
    const etf    = round(baseTotal * 0.03);
    const grand  = epfTotal + etf;

    // 3) Check if a saved monthly record exists (to know status)
    const saved = await Contribution.findOne({ period }).lean();
    const status = saved?.status || "Pending";

    res.json({
      period,
      periodLabel: label,
      due: due.toISOString(),
      status,
      baseTotal,
      epfEmp, epfEr, epfTotal,
      etf,
      grandTotal: grand
    });
  } catch (e) {
    console.error("[contrib:summary]", e);
    res.status(500).json({ message: "Failed to load summary" });
  }
});

// ---- B. CREATE/SAVE a monthly contribution (persists what’s on table) ----
// POST /contributions { period: "YYYY-MM" }
// This locks the computed figures for that month and makes the table row.
router.post("/", async (req, res) => {
  try {
    const period = req.body.period || new Date().toISOString().slice(0,7);
    // compute from Finance right now
    const emps = await Finance.find({}, { Base_Sal: 1 }).lean();
    const baseTotal = emps.reduce((s, e) => s + Number(e.Base_Sal || 0), 0);
    const epfEmp = round(baseTotal * 0.08);
    const epfEr  = round(baseTotal * 0.12);
    const epfTotal = epfEmp + epfEr;
    const etf    = round(baseTotal * 0.03);
    const total  = epfTotal + etf;

    const doc = await Contribution.create({
      period,
      periodLabel: monthLabel(period),
      dueDate: dueDateNextMonth15(period),
      status: "Pending",
      baseTotal, epfEmp, epfEr, etf, total
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Contribution already exists for this period" });
    }
    console.error("[contrib:create]", e);
    res.status(500).json({ message: "Failed to create contribution" });
  }
});

// ---- C. LIST for table (what your UI renders) ----
// GET /contributions?year=2025
router.get("/", async (req, res) => {
  try {
    const year = Number(req.query.year) || undefined;
    const q = year ? { period: { $regex: `^${year}-` } } : {};
    const docs = await Contribution.find(q).sort({ period: -1 }).lean();

    const rows = docs.map(d => ({
      _id: d._id,
      periodLabel: d.periodLabel,
      periodKey: d.period,                       // "YYYY-MM"
      epf: d.epfEmp + d.epfEr,                   // EPF (emp + employer)  ← as you asked
      etf: d.etf,
      total: d.total,                            // epf(emp+er) + etf
      due: d.dueDate?.toISOString().slice(0,10),
      status: d.status
    }));
    res.json({ contributions: rows });
  } catch (e) {
    console.error("[contrib:list]", e);
    res.status(500).json({ message: "Failed to load contributions" });
  }
});

// ---- D. MARK AS PAID ----
// PATCH /contributions/:id/pay { paymentRef? }
router.patch("/:id/pay", async (req, res) => {
  try {
    const doc = await Contribution.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Paid", paidAt: new Date(), paymentRef: req.body?.paymentRef || "" } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    console.error("[contrib:pay]", e);
    res.status(500).json({ message: "Failed to mark as paid" });
  }
});

module.exports = router;
