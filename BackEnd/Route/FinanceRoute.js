// BackEnd/Route/FinanceRoute.js
const express = require("express");
const { getReceivablesSummary, getPayablesSummary } = require("../Controllers/FinanceSummaryController");

const router = express.Router();

router.get("/receivables/summary", getReceivablesSummary);
router.get("/payables/summary", getPayablesSummary);

// (optional) you might wire other finance summary endpoints here in the future

module.exports = router;
