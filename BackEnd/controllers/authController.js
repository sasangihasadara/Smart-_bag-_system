// BackEnd/Controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Model/userModel");

// map role → dashboard path (adjust to your routes if different)
const dashboardRouteFor = (role = "") => {
  const r = String(role || "").toLowerCase();
  if (r.includes("inventory"))   return "/maindashboard";
  if (r.includes("product"))     return "/hirudashboard";
  if (r.includes("cart"))        return "/dashboard";
  if (r.includes("user manager"))return "/isudashboard";
  if (r.includes("finance"))     return "/sanudashboard";
  return "/home";
};

// ---------- REGISTER ----------
exports.registerUser = async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName  = String(req.body?.lastName  || "").trim();
    const email     = String(req.body?.email     || "").trim().toLowerCase();
    const password  = String(req.body?.password  || "");

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "First name, last name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      role: req.body.role || "customer",
      status: "active",
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      route: dashboardRouteFor(user.role),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("REGISTER_ERR:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ---------- LOGIN ----------
exports.loginUser = async (req, res) => {
  try {
    const email    = String(req.body?.email    || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // IMPORTANT: include password explicitly
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      route: dashboardRouteFor(user.role),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("LOGIN_ERR:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};
