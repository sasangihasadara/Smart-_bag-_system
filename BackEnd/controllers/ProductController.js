const Product = require("../Model/ProductModel");

// Helper: sanitize/normalize incoming fields
function parseBody(body = {}) {
  const out = {};
  if (body.name != null) out.name = String(body.name).trim();
  if (body.category != null) out.category = String(body.category).trim();
  if (body.img != null) out.img = String(body.img).trim();

  if (body.price != null) out.price = Number(body.price);
  if (body.stock != null) out.stock = Number.parseInt(body.stock, 10);
  if (body.rating != null) out.rating = Number(body.rating);

  if (body.discountType != null) out.discountType = String(body.discountType);
  if (body.discountValue != null) out.discountValue = Number(body.discountValue);

  return out;
}

// GET /api/products
exports.list = async (_req, res) => {
  try {
    const docs = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json(docs);
  } catch (e) {
    console.error("products list error:", e);
    res.status(500).json({ message: "Error fetching products" });
  }
};

// GET /api/products/:id
exports.getOne = async (req, res) => {
  try {
    const doc = await Product.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Product not found" });
    res.json(doc);
  } catch (e) {
    console.error("products getOne error:", e);
    res.status(400).json({ message: "Invalid product id" });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const data = parseBody(req.body);

    if (!data.name || data.price == null || Number.isNaN(data.price))
      return res.status(400).json({ message: "name and price are required" });

    const created = await Product.create(data);
    res.status(201).json(created);
  } catch (e) {
    console.error("products create error:", e);
    res.status(500).json({ message: "Error creating product" });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = parseBody(req.body);

    const updated = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);
  } catch (e) {
    console.error("products update error:", e);
    // CastError -> invalid ObjectId
    if (e?.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    res.status(500).json({ message: "Error updating product" });
  }
};

// DELETE /api/products/:id
exports.remove = async (req, res) => {
  try {
    const del = await Product.findByIdAndDelete(req.params.id).lean();
    if (!del) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("products remove error:", e);
    if (e?.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    res.status(500).json({ message: "Error deleting product" });
  }
};

/* -------------------------------------------------------------------------- */
/* NEW: /api/products/summary  (supports ?start=YYYY-MM-DD&/or end=YYYY-MM-DD) */
/* -------------------------------------------------------------------------- */
exports.summary = async (req, res) => {
  try {
    const { start, end } = req.query || {};

    const match = {};
    if (start || end) {
      // Build a flexible createdAt window based on what is provided
      const ands = [];
      if (start) {
        ands.push({ $gte: ["$createdAt", new Date(start)] });
      }
      if (end) {
        const endOfDay = new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000 - 1);
        ands.push({ $lte: ["$createdAt", endOfDay] });
      }
      match.$expr = { $and: ands.length ? ands : [{ $gte: ["$createdAt", new Date(0)] }] };
    }

    const [agg] = await Product.aggregate([
      { $match: match },
      {
        $project: {
          // base fields with fallbacks
          price: { $ifNull: ["$price", 0] },
          discountType: { $ifNull: ["$discountType", "none"] },
          discountValue: { $ifNull: ["$discountValue", 0] },
          stock: {
            $ifNull: [
              "$stock",
              { $ifNull: ["$qty", { $ifNull: ["$quantity", 0] }] },
            ],
          },
        },
      },
      {
        $addFields: {
          discountPerUnit: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$discountType", "percentage"] },
                  then: { $multiply: ["$price", { $divide: ["$discountValue", 100] }] },
                },
                {
                  case: { $eq: ["$discountType", "fixed"] },
                  then: "$discountValue",
                },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $addFields: {
          netUnit: {
            $max: [{ $subtract: ["$price", "$discountPerUnit"] }, 0],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$netUnit", "$stock"] } },
          totalQty: { $sum: "$stock" },
          itemCount: { $sum: 1 },
        },
      },
    ]);

    const totalValue = Math.round(Number(agg?.totalValue || 0));
    const totalQty = Number(agg?.totalQty || 0);
    const itemCount = Number(agg?.itemCount || 0);

    // Keep response minimal for your frontend usage, but include extras as helpful
    return res.json({ totalValue, totalQty, itemCount });
  } catch (e) {
    console.error("products summary error:", e);
    res.status(500).json({ message: "Error building products summary" });
  }
};

/* -------------------------------------------------------------------------- */
/*                        Month-aware summary (existing)                      */
/* -------------------------------------------------------------------------- */
/**
 * GET /api/products/summary-v2?months=12
 * Buckets products by createdAt month.
 * Returns:
 *  {
 *    monthly: [{month:'Sep', y:2025, m:9, value:<sum price*stock at creation>, count:<#products>}...],
 *    currentMonth: { value:<thisMonth>, count:<n>, y, m }
 *  }
 */
exports.summaryV2 = async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));

    const buckets = await Product.aggregate([
      {
        $addFields: {
          ts: { $ifNull: ["$createdAt", new Date(0)] },
          unit: {
            $ifNull: [
              "$price",
              { $ifNull: ["$unitPrice", { $ifNull: ["$sellingPrice", 0] }] },
            ],
          },
          q: {
            $ifNull: [
              "$stock",
              { $ifNull: ["$qty", { $ifNull: ["$quantity", 0] }] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { y: { $year: "$ts" }, m: { $month: "$ts" } },
          total: { $sum: { $multiply: ["$unit", "$q"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    // local helpers (self-contained)
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function buildLastNMonths(n = 12) {
      const out = [];
      const now = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: MONTHS[d.getMonth()] });
      }
      return out;
    }
    function mergeMonthSeries(buckets, n = 12, valueKey = "value") {
      const byKey = new Map();
      for (const b of buckets) byKey.set(`${b._id.y}-${b._id.m}`, b);
      return buildLastNMonths(n).map(({ y, m, label }) => {
        const hit = byKey.get(`${y}-${m}`);
        return {
          month: label,
          y, m,
          [valueKey]: Number(hit?.total || 0),
          count: Number(hit?.count || 0),
        };
      });
    }
    function currentYM() {
      const d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }

    const monthly = mergeMonthSeries(buckets, months, "value");
    const { y, m } = currentYM();
    const cm = monthly.find((r) => r.y === y && r.m === m) || { value: 0, count: 0 };

    return res.json({
      monthly,
      currentMonth: { value: Number(cm.value || 0), count: Number(cm.count || 0), y, m },
    });
  } catch (e) {
    console.error("products summaryV2 error:", e);
    res.status(500).json({ message: "Error building products monthly summary" });
  }
};
