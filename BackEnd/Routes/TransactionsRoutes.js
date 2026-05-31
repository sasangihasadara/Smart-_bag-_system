const express = require("express");
const router = express.Router();

/* -----------------------------------------------------------
   Robust controller import (handles case-sensitive file systems)
   ----------------------------------------------------------- */
let tx = null;
const candidates = [
  "../Controllers/Transactioncontrollers", // Windows-friendly / your current import
  "../controllers/Transactioncontrollers", // Linux/Mac case-sensitive path
];

const loadErrors = [];
for (const p of candidates) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    tx = require(p);
    if (tx && typeof tx === "object") break;
  } catch (e) {
    loadErrors.push(`• require("${p}") failed: ${e.message}`);
  }
}
if (!tx) {
  throw new Error(
    `[TransactionsRoutes] Could not load controller.\n${loadErrors.join("\n")}\n` +
    `Make sure the file path/casing matches your filesystem and that the module exports the handlers.`
  );
}

/* -----------------------------------------------------------
   Guard: ensure required handlers exist (better error messages)
   ----------------------------------------------------------- */
[
  "getTransactions",
  "addTransaction",
  "updateTransaction",
  "deleteTransaction",
  "getSummary",
  "getSummaryV2",
  "getRevenueMonthly",
].forEach((k) => {
  if (typeof tx[k] !== "function") {
    throw new Error(`[TransactionsRoutes] Missing controller function: ${k}. Check your exports in Transactioncontrollers.js`);
  }
});

/* ----------------------------- Routes ----------------------------- */
// v1 — supports ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/summary-v1", tx.getSummary);

// v2 — richer summary (today/thisMonth/lastMonth + optional range, and monthly series/currentMonth)
router.get("/summary", tx.getSummaryV2);

// Monthly revenue buckets (?start&end or ?months=N). Returns { series, keys, ... }
router.get("/revenue/monthly", tx.getRevenueMonthly);

// CRUD (put static routes before dynamic)
router.get("/", tx.getTransactions);
router.post("/", tx.addTransaction);
router.put("/:id", tx.updateTransaction);
router.delete("/:id", tx.deleteTransaction);

module.exports = router;
