// BackEnd/Route/SalaryRoute.js
const express = require("express");
const router = express.Router();

const {
  calculateSalary,
  salarySummary,         // v1
  salarySummaryV2,       // v2 (month-aware payroll)
  contributionsSummaryV2 // v2 (month-aware EPF+ETF)
} = require("../Controllers/SalaryController");

// per-employee preview
router.get("/calc", calculateSalary);

// old summary (optional)
router.get("/summary", salarySummary);

// NEW month-aware summaries
router.get("/summary-v2", salarySummaryV2);
router.get("/contributions/summary-v2", contributionsSummaryV2);

module.exports = router;
