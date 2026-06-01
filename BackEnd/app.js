// BackEnd/app.js
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Routes
const inventoryRoutes = require("./Route/InventoryRoute");
const purchaseRoutes = require("./Route/PurchaseRoute");
const productRoutes = require("./Route/ProductRoute");

const cartRoutes = require("./Routes/CartRoutes");
const transactionRoutes = require("./Routes/TransactionsRoutes");

const userRouter = require("./Routes/userRouter");
const authRoutes = require("./Routes/authRoutes");

const financeRoutes = require("./Route/FinanceSalaryRoute");
const attendanceRoutes = require("./Route/AttendanceRoute");
const advanceRoutes = require("./Route/AdvanceRoute");
const salaryRoutes = require("./Route/SalaryRoute");
const transferRoutes = require("./Route/TransferRoute");
const contributions = require("./Route/contributions");

const sewing = require("./Routes/sewingInstructionRoutes");
const quality = require("./Routes/qualityRoutes");

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/packpal";
const app = express();
let dbConnected = false;

if (!process.env.MONGO_URI) {
  console.warn(
    "MONGO_URI is missing in BackEnd/.env. Falling back to mongodb://127.0.0.1:27017/packpal"
  );
}

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

app.use((req, res, next) => {
  if (req.path.startsWith("/api/") && !dbConnected) {
    return res.status(503).json({
      message: "Service unavailable: database is not connected. Check MongoDB settings and network access.",
    });
  }
  next();
});

app.get("/", (_req, res) => res.send("PackPal backend running"));
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    database: dbConnected ? "connected" : "disconnected",
  })
);

app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/products", productRoutes);

app.use("/api/carts", cartRoutes);
app.use("/api/transactions", transactionRoutes);

app.use("/api/users", userRouter);
app.use("/api/auth", authRoutes);

app.use("/api/finances", financeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/advance", advanceRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/contributions", contributions);
app.use("/api/finance", require("./Route/FinanceRoute"));

app.use("/api/sewing-instructions", sewing);
app.use("/api/quality", quality);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

mongoose.set("strictQuery", true);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    dbConnected = true;
    console.log("MongoDB connected successfully");
    console.log("Models loaded:", mongoose.modelNames().join(", ") || "none");
  } catch (error) {
    console.warn("MongoDB connection failed:", error.message);
    console.warn("Server is still running, but database-backed routes will fail until MongoDB is available.");
  }
})();
