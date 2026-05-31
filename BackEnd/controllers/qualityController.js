const mongoose = require("mongoose");
const SewingInstruction = require("../Model/sewingInstructionModel");

// GET /api/quality  -> items currently in "Quality Check"
exports.listQC = async (req, res) => {
  try {
    const { q } = req.query || {};
    const find = { status: "Quality Check" };
    if (q) {
      find.$or = [
        { bag: { $regex: q, $options: "i" } },
        { person: { $regex: q, $options: "i" } },
        { details: { $regex: q, $options: "i" } },
      ];
    }
    const items = await SewingInstruction.find(find).sort({ deadline: 1, createdAt: -1 }).lean();
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[quality] listQC error:", err);
    return res.status(500).json({ message: "Error fetching quality queue" });
  }
};

// POST /api/quality/:id/pass  -> mark as Done
exports.markPass = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const before = await SewingInstruction.findById(id);
    if (!before) return res.status(404).json({ message: "Not found" });

    const after = await SewingInstruction.findByIdAndUpdate(
      id,
      { status: "Done", qcDate: new Date(), qcNote: "" },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ message: "Passed", before, after });
  } catch (err) {
    console.error("[quality] markPass error:", err);
    return res.status(500).json({ message: "Error marking as passed" });
  }
};

// POST /api/quality/:id/fail  -> mark as Failed with note
exports.markFail = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body || {};

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const before = await SewingInstruction.findById(id);
    if (!before) return res.status(404).json({ message: "Not found" });

    const after = await SewingInstruction.findByIdAndUpdate(
      id,
      { status: "Failed", qcDate: new Date(), qcNote: String(note).trim() },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ message: "Failed", before, after });
  } catch (err) {
    console.error("[quality] markFail error:", err);
    return res.status(500).json({ message: "Error marking as failed" });
  }
};
