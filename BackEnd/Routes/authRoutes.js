// BackEnd/Routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { loginUser, registerUser } = require("../Controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
