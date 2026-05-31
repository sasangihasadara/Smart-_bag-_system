// BackEnd/Routes/CartRoutes.js
const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  applyDiscount,
  markSold,
} = require("../controllers/Cartcontrollers");

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", addProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.put("/:id/discount", applyDiscount);

// Finance → bump product
router.post("/:id/sold", markSold);

module.exports = router;
