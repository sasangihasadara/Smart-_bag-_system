// BackEnd/app.js
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// ========== IMPORT ROUTES ==========
// Pulmi
const inventoryRoutes = require("./Route/InventoryRoute");
const purchaseRoutes = require("./Route/PurchaseRoute");
const productRoutes = require("./Route/ProductRoute");

// Sasangi
const cartRoutes = require("./Routes/CartRoutes");
const transactionRoutes = require("./Routes/TransactionsRoutes");

// Isumi (Users / Auth)
const userRouter = require("./Routes/userRouter");
const authRoutes = require("./Routes/authRoutes"); // ✅ Add login/signup route

// Sanugi (Finance)
const financeRoutes = require("./Route/FinanceSalaryRoute");
const attendanceRoutes = require("./Route/AttendanceRoute");
const advanceRoutes = require("./Route/AdvanceRoute");
const salaryRoutes = require("./Route/SalaryRoute");
const transferRoutes = require("./Route/TransferRoute");
const contributions = require("./Route/contributions");

// Hiruni
const sewing = require("./Routes/sewingInstructionRoutes");
const quality = require("./Routes/qualityRoutes");

// ========== BASIC CHECKS ==========
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing in BackEnd/.env");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const app = express();

// ========== MIDDLEWARE ==========
const allowedOrigins = new Set([
 "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
  "http://localhost:3005",
  "http://127.0.0.1:3005",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.has(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS")),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use(express.json());

// ========== ROUTES ==========
app.get("/", (_req, res) => res.send("✅ PackPal Backend Running"));

// Pulmi
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/products", productRoutes);

// Sasangi
app.use("/api/carts", cartRoutes);
app.use("/api/transactions", transactionRoutes);

// Isumi
app.use("/api/users", userRouter); // CRUD
app.use("/api/auth", authRoutes); // ✅ Login/Register

// Sanugi
app.use("/api/finances", financeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/advance", advanceRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/contributions", contributions);
app.use("/api/finance", require("./Route/FinanceRoute"));

// Hiruni
app.use("/api/sewing-instructions", sewing);
app.use("/api/quality", quality);

// Health Check
app.get("/health", (_req, res) => res.json({ ok: true }));

// ========== ERROR HANDLER ==========
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// ========== STARTUP ==========
(async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
    console.log("📦 Models loaded:", mongoose.modelNames().join(", "));

    app.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error("❌ MongoDB connection failed:", e.message);
    process.exit(1);
  }
})();
