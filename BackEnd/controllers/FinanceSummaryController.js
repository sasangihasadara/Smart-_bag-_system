// BackEnd/Controllers/FinanceSummaryController.js
const mongoose = require("mongoose");
const Transaction = require("../Model/TransactionModel");
const Purchase = require("../Model/PurchaseModel");
const Inventory = require("../Model/InventoryModel");

/** helper: range by createdAt (fallback to date/orderDate) */
function rangeMatch(startISO, endISO, fallbackDateField = "date") {
  if (!startISO || !endISO) return {};
  return {
    $expr: {
      $and: [
        {
          $gte: [
            {
              $ifNull: [
                "$createdAt",
                { $dateFromString: { dateString: `$${fallbackDateField}`, format: "%Y-%m-%d", onError: new Date(0), onNull: new Date(0) } },
              ],
            },
            new Date(startISO),
          ],
        },
        {
          $lte: [
            {
              $ifNull: [
                "$createdAt",
                { $dateFromString: { dateString: `$${fallbackDateField}`, format: "%Y-%m-%d", onError: new Date(0), onNull: new Date(0) } },
              ],
            },
            new Date(new Date(endISO).getTime() + 24 * 60 * 60 * 1000 - 1),
          ],
        },
      ],
    },
  };
}

/** GET /api/finance/receivables/summary?start=&end=
 *  AR = sum of Transaction.total where status === "pending"
 */
exports.getReceivablesSummary = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const match = {
      $expr: {
        $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "pending"],
      },
      ...(start && end ? rangeMatch(start, end, "date") : {}),
    };

    const [agg] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);

    return res.json({
      total: Number(agg?.total || 0),
      count: Number(agg?.count || 0),
    });
  } catch (e) {
    console.error("getReceivablesSummary error:", e);
    res.status(500).json({ message: "Failed to compute receivables" });
  }
};

/** GET /api/finance/payables/summary?start=&end=
 *  AP = sum over Purchases where status === "approved" of (quantity × inventory.unitPrice for itemId)
 */
exports.getPayablesSummary = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const match = {
      $expr: {
        $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "approved"],
      },
      ...(start && end ? rangeMatch(start, end, "orderDate") : {}),
    };

    const orders = await Purchase.find(match)
      .select("itemId quantity createdAt orderDate status")
      .lean();

    if (!orders.length) {
      return res.json({ total: 0, count: 0 });
    }

    // fetch unit prices for all itemIds at once
    const ids = [...new Set(orders.map(o => String(o.itemId || "").trim()).filter(Boolean))];
    const priceDocs = await Inventory.find({ id: { $in: ids } })
      .select("id unitPrice costPrice price")
      .lean();

    const priceMap = new Map();
    for (const d of priceDocs) {
      const unit = Number(d?.unitPrice ?? d?.costPrice ?? d?.price ?? 0);
      priceMap.set(String(d.id).trim(), Number.isFinite(unit) ? unit : 0);
    }

    let total = 0;
    for (const o of orders) {
      const unit = priceMap.get(String(o.itemId).trim()) || 0;
      const q = Number(o.quantity) || 0;
      total += unit * q;
    }

    return res.json({ total: Math.round(total), count: orders.length });
  } catch (e) {
    console.error("getPayablesSummary error:", e);
    res.status(500).json({ message: "Failed to compute payables" });
  }
};
