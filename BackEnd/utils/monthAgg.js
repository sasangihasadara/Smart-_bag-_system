// BackEnd/utils/monthAgg.js

// Short month labels for charts/UI
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Return the current year & month as numbers. */
function currentYM() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

/** Build the last N months ending at the current month. */
function buildLastNMonths(n = 12) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      label: MONTHS[d.getMonth()],
    });
  }
  return out;
}

/**
 * Merge Mongo `$group` buckets into a fixed last-N-months series.
 *
 * Expected `buckets` shape from aggregation:
 *   { _id: { y: <Number>, m: <Number> }, total: <Number>, count: <Number> }
 *
 * Returns array:
 *   [{ month: 'Sep', y: 2025, m: 9, [valueKey]: <total>, count: <count> }, ...]
 */
function mergeMonthSeries(buckets = [], n = 12, valueKey = "value") {
  const byKey = new Map();
  for (const b of buckets) {
    // Be resilient to slightly different shapes:
    const y = b?._id?.y ?? b?.y;
    const m = b?._id?.m ?? b?.m;
    if (typeof y === "number" && typeof m === "number") {
      byKey.set(`${y}-${m}`, {
        total: Number(b.total || 0),
        count: Number(b.count || 0),
      });
    }
  }

  return buildLastNMonths(n).map(({ y, m, label }) => {
    const hit = byKey.get(`${y}-${m}`);
    return {
      month: label,
      y,
      m,
      [valueKey]: hit ? hit.total : 0,
      count: hit ? hit.count : 0,
    };
  });
}

module.exports = {
  MONTHS,
  currentYM,
  buildLastNMonths,
  mergeMonthSeries,
};
