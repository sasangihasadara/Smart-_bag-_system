// Routes/AdvanceRoute.js
const express = require("express");
const {
  getAllAdvance,
  addAdvance,
  computeAndCreateAdvance,
  getAdvanceById,
  updateAdvance,
  deleteAdvance,
} = require("../Controllers/AdvanceController");

const router = express.Router();

// CRUD + compute
router.get("/", getAllAdvance);
router.post("/", addAdvance);
router.post("/compute", computeAndCreateAdvance);
router.get("/:id", getAdvanceById);
router.put("/:id", updateAdvance);
router.delete("/:id", deleteAdvance);

module.exports = router;
