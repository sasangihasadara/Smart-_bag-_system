// lib/contrib.js
function monthLabel(period) { // "2025-02"
  const d = new Date(`${period}-01T00:00:00Z`);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function dueDateNextMonth15(period) {
  const d = new Date(`${period}-01T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 15)); // 15th next month
}

function round(n) { return Math.round(Number(n || 0)); }

module.exports = { monthLabel, dueDateNextMonth15, round };
