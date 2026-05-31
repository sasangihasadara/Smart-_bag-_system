// BackEnd/Controllers/Cartcontrollers.js
const mongoose = require("mongoose");
const CartProduct = require("../Model/Cartmodel");
const Transaction = require("../Model/TransactionModel");

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

exports.getProducts = async (_req, res) => {
  try {
    const products = await CartProduct.find();
    return res.json({ success: true, data: products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- GET ONE ----------
exports.getProductById = async (req, res) => {
  try {
    const product = await CartProduct.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- ADD ----------
exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      img,
      price,
      stock,
      rating,
      discountType,
      discountValue,
    } = req.body || {};

    if (!name || price === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Name and price are required" });
    }

    const created = await CartProduct.create({
      name,
      category,
      img,
      price,
      stock,
      rating,
      discountType: discountType || "none",
      discountValue: Number(discountValue || 0),
      // reorderLevel is schema-default (20)
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- UPDATE ----------
exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { reorderLevel, stock, ...rest } = req.body || {};

    const doc = await CartProduct.findById(id);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Only allow reorderLevel to increase, and never below 20
    let nextReorder = doc.reorderLevel;
    if (reorderLevel !== undefined) {
      nextReorder = Math.max(20, Number(reorderLevel) || 20, doc.reorderLevel);
    }

    // Stock cannot be negative
    let nextStock = doc.stock;
    if (stock !== undefined) {
      nextStock = Math.max(0, Number(stock) || 0);
    }

    Object.assign(doc, rest);
    doc.reorderLevel = nextReorder;
    doc.stock = nextStock;

    const saved = await doc.save();
    return res.json({ success: true, data: saved });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- DELETE ----------
exports.deleteProduct = async (req, res) => {
  try {
    const del = await CartProduct.findByIdAndDelete(req.params.id);
    if (!del)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- APPLY DISCOUNT ----------
exports.applyDiscount = async (req, res) => {
  try {
    const { discountType, discountValue } = req.body || {};
    const valid = ["none", "percentage", "fixed"];
    if (!valid.includes(discountType)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount type" });
    }

    const updated = await CartProduct.findByIdAndUpdate(
      req.params.id,
      { discountType, discountValue: Number(discountValue || 0) },
      { new: true, runValidators: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- MARK SOLD (Qty ↑ from Finance) ----------
// Increases reorderLevel by qty (keeps floor 20) and decreases stock by qty (floor 0).
// Also updates/creates the latest finance transaction for this product.
exports.markSold = async (req, res) => {
  try {
    const productId = req.params.id;
    const qty = Math.max(1, Number(req.body?.qty) || 1);

    if (!isObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    // 1) Adjust product atomically (simple two-step to keep compatibility)
    const p = await CartProduct.findById(productId);
    if (!p)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const newStock = Math.max(0, Number(p.stock || 0) - qty);
    const newReorder = Math.max(20, Number(p.reorderLevel || 20) + qty);

    const updatedProduct = await CartProduct.findByIdAndUpdate(
      productId,
      { $set: { stock: newStock, reorderLevel: newReorder } },
      { new: true }
    );

    // 2) Update latest finance transaction for this product
    const latestTx = await Transaction.findOne({ productId }).sort({ date: -1 });
    if (latestTx) {
      const newQty = Number(latestTx.qty || 0) + qty;
      const unit = Number(latestTx.unitPrice || 0);
      const disc = Number(latestTx.discountPerUnit || 0);
      const effective = Math.max(0, unit - disc);

      latestTx.qty = newQty;
      latestTx.total = effective * newQty;
      await latestTx.save();
    } else {
      const unit = Number(p.price || 0);
      const disc =
        p.discountType === "percentage"
          ? unit * (Number(p.discountValue || 0) / 100)
          : p.discountType === "fixed"
          ? Number(p.discountValue || 0)
          : 0;
      const effective = Math.max(0, unit - disc);

      await Transaction.create({
        id: `AUTO-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        customer: "System (Reorder)",
        productId,
        productName: p.name,
        qty,
        unitPrice: unit,
        discountPerUnit: disc,
        total: effective * qty,
        method: "System",
        status: "Reorder Added",
        notes: "Auto-updated from Product Reorder",
      });
    }

    return res.json({
      success: true,
      message:
        "Reorder level increased and stock decreased. Finance qty updated.",
      data: updatedProduct,
    });
  } catch (err) {
    console.error("markSold error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
