const SewingInstruction = require("../Model/sewingInstructionModel");

// GET /api/sewing-instructions
exports.list = async (req, res) => {
  try {
    const items = await SewingInstruction.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ items });
  } catch (err) {
    console.error("list error:", err);
    return res.status(500).json({ message: "Error fetching sewing instructions" });
  }
};

// GET /api/sewing-instructions/:id
exports.getOne = async (req, res) => {
  try {
    const item = await SewingInstruction.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ item });
  } catch (err) {
    console.error("getOne error:", err);
    return res.status(500).json({ message: "Error fetching sewing instruction" });
  }
};

// POST /api/sewing-instructions
exports.create = async (req, res) => {
  try {
    const { bag, details = "", person, deadline, priority = "High", status = "In Progress" } = req.body;

    if (!bag || !person || !deadline) {
      return res.status(400).json({ message: "bag, person and deadline are required" });
    }

    const doc = await SewingInstruction.create({
      bag,
      details,
      person,
      deadline, // "YYYY-MM-DD" string OK; Mongoose casts to Date
      priority,
      status,
    });

    return res.status(201).json({ item: doc });
  } catch (err) {
    console.error("create error:", err);
    return res.status(500).json({ message: "Error creating sewing instruction" });
  }
};

// PUT /api/sewing-instructions/:id
exports.update = async (req, res) => {
  try {
    const { bag, details, person, deadline, priority, status } = req.body;

    const before = await SewingInstruction.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Not found" });

    const after = await SewingInstruction.findByIdAndUpdate(
      req.params.id,
      { bag, details, person, deadline, priority, status },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ message: "Updated", before, after });
  } catch (err) {
    console.error("update error:", err);
    return res.status(500).json({ message: "Error updating sewing instruction" });
  }
};

// DELETE /api/sewing-instructions/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await SewingInstruction.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted", deleted });
  } catch (err) {
    console.error("remove error:", err);
    return res.status(500).json({ message: "Error deleting sewing instruction" });
  }
};
