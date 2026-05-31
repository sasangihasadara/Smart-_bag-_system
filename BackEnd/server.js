// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// CORS – allow your frontend origin
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", require("./BackEnd/Routes/authRoutes"));
app.use("/api/users", require("./BackEnd/Routes/userRouter"));

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// MongoDB connect
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/packpal";
mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ API running on :${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  });
