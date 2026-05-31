// BackEnd/Routes/userRouter.js
const express = require("express");
const { body } = require("express-validator");
const userController = require("../Controllers/userController");

const router = express.Router();

const createRules = [
  body("firstName").trim().isLength({ min: 2 }).withMessage("First name required"),
  body("lastName").trim().isLength({ min: 2 }).withMessage("Last name required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isStrongPassword({
    minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1,
  }).withMessage("Weak password"),
];

router.get("/", userController.getAllUsers);
router.post("/", ...createRules, userController.addUser);
router.get("/:id", userController.getById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
