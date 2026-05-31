// BackEnd/Routes/TransferRoute.js
const express = require("express");
const Transfer = require("../Model/TransferModel");

const router = express.Router();

/** CREATE (from Salary Management “Transfer Salary”) */
router.post("/", async (req, res) => {
  try {
    const { empId, empName, amount, month } = req.body;
    if (!empId || !amount || !month) {
      return res.status(400).json({ message: "empId, amount and month are required" });
    }
    const doc = await Transfer.create({
      empId,
      empName: empName || "",
      amount: Math.round(Number(amount || 0)),
      month,
      date: new Date().toISOString().slice(0, 10),
      status: "Pending",
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Transfer already exists for this month" });
    }
    console.error("[transfers:create]", e);
    res.status(500).json({ message: "Failed to create transfer" });
  }
});

/** LIST all */
router.get("/", async (_req, res) => {
  try {
    const rows = await Transfer.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ transfers: rows });
  } catch (e) {
    console.error("[transfers:list]", e);
    res.status(500).json({ message: "Failed to fetch transfers" });
  }
});

/** MARK AS PAID */
router.patch("/:id/pay", async (req, res) => {
  try {
    const updated = await Transfer.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Paid" } },
      { new: true }
    ).lean().exec();
    if (!updated) return res.status(404).json({ message: "Transfer not found" });
    res.json(updated);
  } catch (e) {
    console.error("[transfers:pay]", e);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/** DELETE */
router.delete("/:id", async (req, res) => {
  try {
    const del = await Transfer.findByIdAndDelete(req.params.id).lean().exec();
    if (!del) return res.status(404).json({ message: "Transfer not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("[transfers:delete]", e);
    res.status(500).json({ message: "Failed to delete transfer" });
  }
});

module.exports = router;
