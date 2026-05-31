const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../Model/userModel");

const normalizeEmail = (s = "") => s.trim().toLowerCase();
const safeUser = (u) => ({
  _id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  role: u.role,
  status: u.status,
  createdAt: u.createdAt,
});

// GET /api/users
exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/users
exports.addUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }
  try {
    const { firstName, lastName, email, password, role } = req.body || {};
    const emailNorm = normalizeEmail(email);

    const exists = await User.findOne({ email: emailNorm });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email: emailNorm,
      password: hash,
      role: role || "customer",
      status: "active",
    });

    res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid ID" });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, status, password } = req.body || {};
    const patch = { firstName, lastName, role, status };

    if (email) patch.email = normalizeEmail(email);
    if (password) patch.password = await bcrypt.hash(String(password), 12);

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      patch,
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Update failed" });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id).select("-password");
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user: deleted });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Delete failed" });
  }
};
