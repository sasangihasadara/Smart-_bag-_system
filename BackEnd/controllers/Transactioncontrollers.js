/* eslint-disable camelcase */
const mongoose = require("mongoose");
const Transaction = require("../Model/TransactionModel");
// If your "product" data lives in ProductModel, swap the require below:
// const Product = require("../Model/ProductModel");
const Product = require("../Model/CartModel");

/* -------------------------- month helpers -------------------------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentYM = () => {
  const d = new Date();
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};
function buildLastNMonths(n = 12) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, label: MONTHS[d.getUTCMonth()] });
  }
  return out;
}
function mergeMonthSeries(buckets, n = 12, valueKey = "revenue") {
  const byKey = new Map();
  for (const b of buckets) byKey.set(`${b._id.y}-${b._id.m}`, b);
  return buildLastNMonths(n).map(({ y, m, label }) => {
    const hit = byKey.get(`${y}-${m}`);
    return {
      month: label,
      y, m,
      [valueKey]: Number(hit?.total || hit?.revenue || 0),
      count: Number(hit?.count || 0),
    };
  });
}

/* -------------------------- misc helpers --------------------------- */
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const txFilter = (idOrTxId) => (isObjectId(idOrTxId) ? { _id: idOrTxId } : { id: idOrTxId });

// helper to coerce totals to numbers during aggregation (fixes "string totals" → 0 issue)
const NUM = (path) => ({ $toDouble: { $ifNull: [ path, 0 ] } });

/**
 * Date-range matcher that prefers `createdAt` (Date) and falls back to `date` (string/Date).
 * Accepts YYYY-MM-DD strings for start/end; end is made inclusive for the whole day.
 */
function rangeMatch(startISO, endISO) {
  if (!startISO || !endISO) return {};
  const start = new Date(`${String(startISO).slice(0,10)}T00:00:00.000Z`);
  const end   = new Date(`${String(endISO).slice(0,10)}T23:59:59.999Z`);
  if (Number.isNaN(+start) || Number.isNaN(+end)) return {};

  return {
    $expr: {
      $and: [
        {
          $gte: [
            {
              $ifNull: [
                "$createdAt",
                {
                  $convert: {
                    input: "$date",
                    to: "date",
                    onError: new Date(0),
                    onNull: new Date(0),
                  }
                }
              ]
            },
            start,
          ],
        },
        {
          $lte: [
            {
              $ifNull: [
                "$createdAt",
                {
                  $convert: {
                    input: "$date",
                    to: "date",
                    onError: new Date(0),
                    onNull: new Date(0),
                  }
                }
              ]
            },
            end,
          ],
        },
      ],
    },
  };
}

/* ================================= CRUD ==================================== */

// Get all transactions (optionally by createdAt/date range)
exports.getTransactions = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const match = { ...(start && end ? rangeMatch(start, end) : {}) };
    const txs = await Transaction.find(match).sort({ createdAt: -1 }).lean().exec();
    return res.json(txs);
  } catch (err) {
    console.error("getTransactions:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch transactions", details: err.message });
  }
};

// Add transaction
exports.addTransaction = async (req, res) => {
  try {
    const {
      productId,
      qty,
      customer = "",
      customerId = "",
      fmc = true,
      method = "Cash",
      status = "Paid",
      notes = "",
      date, // "YYYY-MM-DD" optional
      id,   // optional custom id
    } = req.body || {};

    const q = Math.max(1, Number(qty) || 0);
    if (!isObjectId(productId)) {
      return res.status(400).json({ ok: false, error: "Invalid productId (must be a Mongo ObjectId)" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(400).json({ ok: false, error: "Invalid product (not found)" });

    const unitPrice = Number(product.price ?? 0);
    const discountType = product.discountType || "none"; // "none" | "percentage" | "fixed"
    const discountValue = Number(product.discountValue ?? 0);

    let discountPerUnit = 0;
    if (discountType === "percentage") discountPerUnit = unitPrice * (discountValue / 100);
    else if (discountType === "fixed") discountPerUnit = discountValue;
    if (!Number.isFinite(discountPerUnit) || discountPerUnit < 0) discountPerUnit = 0;

    const effectiveUnit = Math.max(0, unitPrice - discountPerUnit);
    const total = effectiveUnit * q;

    const txDoc = new Transaction({
      id: id || `TX-${Date.now()}`,
      // store as Date; Mongoose can cast strings but we normalize here
      date: date ? new Date(`${date}T00:00:00.000Z`) : undefined,
      customer, customerId, fmc: Boolean(fmc),
      productId, productName: product.name || "Unknown",
      qty: q, unitPrice, discountPerUnit, total,
      method, status, notes,
    });

    const saved = await txDoc.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("addTransaction:", err);
    return res.status(500).json({ ok: false, error: "Failed to add transaction", details: err.message });
  }
};

// Update
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: "Missing id parameter" });

    // normalize possible date strings to Date
    const body = { ...req.body };
    if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      body.date = new Date(`${body.date}T00:00:00.000Z`);
    }

    const updated = await Transaction.findOneAndUpdate(txFilter(id), body, { new: true });
    if (!updated) return res.status(404).json({ ok: false, error: "Transaction not found" });
    return res.json(updated);
  } catch (err) {
    console.error("updateTransaction:", err);
    return res.status(500).json({ ok: false, error: "Failed to update transaction", details: err.message });
  }
};

// Delete
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: "Missing id parameter" });

    const deleted = await Transaction.findOneAndDelete(txFilter(id));
    if (!deleted) return res.status(404).json({ ok: false, error: "Transaction not found" });

    return res.json({ ok: true, message: "Transaction deleted", deleted: { _id: deleted._id, id: deleted.id } });
  } catch (err) {
    console.error("deleteTransaction:", err);
    return res.status(500).json({ ok: false, error: "Failed to delete transaction", details: err.message });
  }
};

/* =============================== SUMMARIES ================================== */

// All-time or range revenue + count (Refunds excluded)
exports.getSummary = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const match = { status: { $ne: "Refund" } };
    if (start && end) Object.assign(match, rangeMatch(start, end));

    const [agg] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
    ]);

    return res.json({ revenue: Number(agg?.revenue || 0), count: Number(agg?.count || 0) });
  } catch (err) {
    console.error("getSummary:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute revenue", details: err.message });
  }
};

/**
 * V2 summary:
 * - today / thisMonth / lastMonth (+ optional range by createdAt/date)
 * - all-time, monthly (last N normalized), currentMonth (by createdAt/date)
 */
exports.getSummaryV2 = async (req, res) => {
  try {
    const baseMatch = { status: { $ne: "Refund" } };
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();

    const todayStart = new Date(Date.UTC(y, m, now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(y, m, now.getUTCDate(), 23, 59, 59, 999));

    const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const monthEnd   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    const lastMonthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const lastMonthEnd   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // today / thisMonth / lastMonth (fast path on createdAt)
    const [todayAgg] = await Transaction.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
    ]);
    const [monthAgg] = await Transaction.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
    ]);
    const [lastMonthAgg] = await Transaction.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
    ]);

    // all-time (for cards)
    const [all] = await Transaction.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
    ]);

    // monthly buckets using createdAt or fallback "date"
    const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));
    const monthBuckets = await Transaction.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          ts: {
            $ifNull: [
              "$createdAt",
              {
                $convert: {
                  input: "$date",
                  to: "date",
                  onError: new Date(0),
                  onNull: new Date(0),
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: { y: { $year: "$ts" }, m: { $month: "$ts" } },
          total: { $sum: NUM("$total") },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    const monthly = mergeMonthSeries(monthBuckets, months, "revenue");
    const { y: cy, m: cmv } = currentYM();
    const cm = monthly.find((r) => r.y === cy && r.m === cmv) || { revenue: 0, count: 0 };

    // optional range (createdAt/date-aware)
    const { start, end } = req.query || {};
    let range = null;
    if (start && end) {
      const [rangeAgg] = await Transaction.aggregate([
        { $match: { ...baseMatch, ...rangeMatch(start, end) } },
        { $group: { _id: null, revenue: { $sum: NUM("$total") }, count: { $sum: 1 } } },
      ]);
      range = { start, end, revenue: Number(rangeAgg?.revenue || 0), count: Number(rangeAgg?.count || 0) };
    }

    return res.json({
      // v2 (first style)
      today:      { revenue: Number(todayAgg?.revenue || 0), count: Number(todayAgg?.count || 0) },
      thisMonth:  { revenue: Number(monthAgg?.revenue || 0), count: Number(monthAgg?.count || 0) },
      lastMonth:  { revenue: Number(lastMonthAgg?.revenue || 0), count: Number(lastMonthAgg?.count || 0) },
      ...(range ? { range } : {}),

      // v2 (second style)
      allTime:    { revenue: Number(all?.revenue || 0), count: Number(all?.count || 0) },
      monthly, // [{month:'Sep', y:2025, m:9, revenue:..., count:...}, ...]
      currentMonth: { revenue: Number(cm.revenue || 0), count: Number(cm.count || 0), y: cy, m: cmv },
    });
  } catch (err) {
    console.error("getSummaryV2:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute monthly revenue summary", details: err.message });
  }
};

/**
 * /transactions/revenue/monthly
 * - If ?start=YYYY-MM-DD&end=YYYY-MM-DD: buckets ONLY in that range (createdAt/date-aware)
 * - Else: last ?months=N (default 12), normalized (fills missing months)
 *
 * Response includes:
 *  - legacy `series`: [{ y, m, month, revenue, count }, ...]
 *  - `keys`: [{ key: "YYYY-MM", revenue }, ...]
 */
exports.getRevenueMonthly = async (req, res) => {
  try {
    const { start, end, months: monthsStr } = req.query || {};
    const baseMatch = { status: { $ne: "Refund" } };

    if (start && end) {
      // Range mode (createdAt/date-aware)
      const raw = await Transaction.aggregate([
        { $match: { ...baseMatch, ...rangeMatch(start, end) } },
        {
          $addFields: {
            ts: {
              $ifNull: [
                "$createdAt",
                {
                  $convert: {
                    input: "$date",
                    to: "date",
                    onError: new Date(0),
                    onNull: new Date(0),
                  }
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: { y: { $year: "$ts" }, m: { $month: "$ts" } },
            total: { $sum: NUM("$total") },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]);

      const series = raw.map((b) => ({
        y: b._id.y,
        m: b._id.m,
        month: MONTHS[b._id.m - 1],
        revenue: Number(b.total || 0),
        count: Number(b.count || 0),
      }));
      const keys = raw.map((b) => ({
        key: `${b._id.y}-${String(b._id.m).padStart(2, "0")}`,
        revenue: Number(b.total || 0),
      }));

      return res.json({ series, keys, start, end });
    }

    // Last N months mode
    const months = Math.max(1, Math.min(24, Number(monthsStr || 12)));
    const raw = await Transaction.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          ts: {
            $ifNull: [
              "$createdAt",
              {
                $convert: {
                  input: "$date",
                  to: "date",
                  onError: new Date(0),
                  onNull: new Date(0),
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: { y: { $year: "$ts" }, m: { $month: "$ts" } },
          total: { $sum: NUM("$total") },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    const merged = mergeMonthSeries(raw, months, "revenue");
    const series = merged.map((r) => ({
      y: r.y,
      m: r.m,
      month: r.month,
      revenue: Number(r.revenue || 0),
      count: Number(r.count || 0),
    }));
    const keys = merged.map((r) => ({
      key: `${r.y}-${String(r.m).padStart(2, "0")}`,
      revenue: Number(r.revenue || 0),
    }));

    return res.json({ series, keys, months });
  } catch (err) {
    console.error("getRevenueMonthly:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute monthly revenue", details: err.message });
  }
};
