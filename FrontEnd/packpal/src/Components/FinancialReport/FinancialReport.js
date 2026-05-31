// src/Components/FinancialReport/FinancialReport.jsx
// (unchanged structure; keeping everything, but the backend now guarantees correct createdAt-based sums)
import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./FinancialReport.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { api } from "../../lib/api";

/* ───────── number/date helpers ───────── */
const fmtLKRNum = (n) => Math.round(Number(n || 0)).toLocaleString("en-LK");
const fmtLKR = (n) => `LKR ${fmtLKRNum(n)}`;
const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtDate = (d) => new Date(d).toISOString().split("T")[0];

/* Date-only helpers that are timezone-safe (compare numbers, not strings) */
const isoDateOnly = (iso) => (iso || "").slice(0, 10);
const asUTCDateStart = (isoDate /* YYYY-MM-DD */) =>
  new Date(`${isoDate}T00:00:00.000Z`).getTime();
const asUTCDateEnd = (isoDate /* YYYY-MM-DD */) =>
  new Date(`${isoDate}T23:59:59.999Z`).getTime();

/* Inclusive range checker (by millis) */
const inInclusiveRange = (ms, startMs, endMs) => ms >= startMs && ms <= endMs;

/* === Canonical month key helpers (UTC to avoid timezone drift) === */
const monthKeyUTC = (dLike) => {
  const d = new Date(dLike);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};
const normalizeMonthKey = (v) => {
  if (v == null) return null;
  if (typeof v === "string" && /^\d{4}-\d{1,2}$/.test(v)) {
    const [y, m] = v.split("-");
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 7);
  }
  return monthKeyUTC(v);
};

const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short" });
};

const generateMonthRange = (fromISO, toISO, maxMonths = 12) => {
  const s = new Date(`${isoDateOnly(fromISO)}T00:00:00.000Z`);
  const e = new Date(`${isoDateOnly(toISO)}T00:00:00.000Z`);
  const start = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1);
  const end = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1);

  const keys = [];
  let cur = start;
  for (let i = 0; i < maxMonths && cur <= end; i++) {
    const d = new Date(cur);
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    const next = new Date(cur);
    next.setUTCMonth(next.getUTCMonth() + 1);
    cur = Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1);
  }
  return { keys, labels: keys.map(monthLabel) };
};

const titleCase = (s = "") => s.replace(/[_\-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const mapFromArray = (arr, keyCandidates, valCandidates) => {
  const m = {};
  if (!Array.isArray(arr)) return m;
  arr.forEach((it) => {
    const rawK = keyCandidates.map((k) => it?.[k]).find(Boolean);
    const k = normalizeMonthKey(rawK);
    const v = valCandidates.map((v) => it?.[v]).find((v) => Number.isFinite(Number(v)));
    if (k != null) m[k] = Number(v) || 0;
  });
  return m;
};

/* Transaction total helper */
const lineTotal = (t) => {
  const q = toNum(t?.qty ?? t?.quantity ?? 0);
  const p = toNum(t?.unitPrice ?? t?.price ?? 0);
  const d = toNum(t?.discountPerUnit ?? t?.discount ?? 0);
  const explicit = Number(t?.total);
  return Number.isFinite(explicit) ? explicit : q * p - q * d;
};

/* Resolve a transaction's date for filtering */
const pickTxDate = (t) =>
  t?.date ||
  t?.createdAt ||
  t?.created_on ||
  t?.created_at ||
  t?.invoiceDate ||
  t?.paidAt ||
  null;

/* Notifications */
const toast = (message, type = "info") => {
  document.querySelectorAll(".notification").forEach((n) => n.remove());
  const colors = { success: "#10B981", error: "#EF4444", warning: "#F59E0B", info: "#3B82F6" };
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  const n = document.createElement("div");
  n.className = "notification";
  n.style.cssText = `
    position:fixed; top:20px; right:20px; background:#fff; color:${colors[type]};
    padding:15px 20px; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.15);
    border-left:4px solid ${colors[type]}; z-index:10000; display:flex; align-items:center; gap:10px;
    max-width:420px; animation:slideIn .3s ease; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  `;
  n.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes slideOut { from { transform:translateX(0); opacity:1; } to { transform:translateX(100%); opacity:0; } }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(n);
  setTimeout(() => {
    n.style.animation = "slideOut .3s ease";
    setTimeout(() => n.remove(), 300);
  }, 2600);
};

/* ───────── data access helpers ───────── */
const safeGet = async (path, fallback = null) => {
  try {
    const { data } = await api.get(path);
    return data ?? fallback;
  } catch {
    return fallback;
  }
};
const getFirstArray = async (paths) => {
  for (const p of paths) {
    const d = await safeGet(p, null);
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.contributions)) return d.contributions;
  }
  return [];
};
const getNetFromPayroll = (row) => {
  const candidates = [row?.Net_Salary, row?.netSalary, row?.net, row?.totalNet, row?.amount, row?.total].map(Number);
  return candidates.find(Number.isFinite) || 0;
};

/* === Single source of truth: expenses for a range (dashboard-aligned) === */
const fetchExpensesRange = async (startISO, endISO) => {
  const qs =
    startISO && endISO ? `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}` : "";

  // Try the range-aware summaries first
  const [payroll, contrib, invSum] = await Promise.all([
    safeGet(`/salary/summary${qs}`, { totalNet: 0 }),
    safeGet(`/contributions/summary${qs}`, { grandTotal: 0 }),
    safeGet(`/inventory/summary${qs}`, { inventory: { totalValue: 0 } }),
  ]);

  let payrollTotal = toNum(payroll?.totalNet, 0);
  let contribTotal = toNum(contrib?.grandTotal, 0);
  let inventoryOnly = toNum(invSum?.inventory?.totalValue, 0);

  if (!Number.isFinite(payrollTotal) || payrollTotal < 0) payrollTotal = 0;
  if (!Number.isFinite(contribTotal) || contribTotal < 0) contribTotal = 0;
  if (!Number.isFinite(inventoryOnly) || inventoryOnly < 0) inventoryOnly = 0;

  return {
    total: payrollTotal + contribTotal + inventoryOnly,
    breakdown: { payroll: payrollTotal, contrib: contribTotal, inventory: inventoryOnly },
  };
};

/* === NEW: read the exact expenses total the dashboard uses for the same date range === */
const fetchDashboardExpensesTotal = async (startISO, endISO) => {
  const qs =
    startISO && endISO ? `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}` : "";

  // Try /dashboard with several common shapes used by cards
  const dash = await safeGet(`/dashboard${qs}`, null);
  if (dash) {
    // common shapes: { expenses: { total } }, { cards: { expenses: { total } } }, or flat
    const c1 = toNum(dash?.expenses?.total, NaN);
    if (Number.isFinite(c1)) return c1;

    const c2 = toNum(dash?.cards?.expenses?.total, NaN);
    if (Number.isFinite(c2)) return c2;

    const c3 = toNum(dash?.totals?.expenses, NaN);
    if (Number.isFinite(c3)) return c3;

    const c4 = toNum(dash?.expensesTotal, NaN);
    if (Number.isFinite(c4)) return c4;
  }

  // Other endpoints that might expose the exact dashboard total
  const dAlt = await safeGet(`/dashboard/expenses/total${qs}`, null);
  const dAltTotal = toNum(dAlt?.total ?? dAlt?.value, NaN);
  if (Number.isFinite(dAltTotal)) return dAltTotal;

  // Fallback to our composed calculation if dashboard total isn't exposed
  const exp = await fetchExpensesRange(startISO, endISO);
  return toNum(exp?.total, 0);
};

/* Range object (normalized) */
const getRange = (fromISO, toISO) => {
  const from = isoDateOnly(fromISO);
  const to = isoDateOnly(toISO);
  return {
    fromISO: from,
    toISO: to,
    fromMs: asUTCDateStart(from),
    toMs: asUTCDateEnd(to),
  };
};

/* === Exact Revenue — uses backend createdAt-aware totals === */
const fetchExactRevenue = async (startISO, endISO) => {
  const { fromISO, toISO, fromMs, toMs } = getRange(startISO, endISO);
  const qs = `?start=${encodeURIComponent(fromISO)}&end=${encodeURIComponent(toISO)}`;

  const total = await safeGet(`/transactions/revenue${qs}`, null);
  const fromTotal = toNum(total?.revenue, NaN);
  if (Number.isFinite(fromTotal)) return fromTotal;

  const v2 = await safeGet(`/transactions/summary${qs}`, null);
  const v2Range = toNum(v2?.range?.revenue, NaN);
  if (Number.isFinite(v2Range)) return v2Range;

  const monthly = await safeGet(`/transactions/revenue/monthly${qs}`, null);
  if (monthly?.series?.length) {
    return monthly.series.reduce((acc, r) => acc + toNum(r?.revenue, 0), 0);
  }

  const tx = await safeGet(`/transactions${qs}`, []);
  if (Array.isArray(tx) && tx.length) {
    return tx
      .filter((t) => {
        const raw = t?.createdAt || t?.date || null;
        if (!raw) return false;
        const ms = new Date(isoDateOnly(raw) + "T12:00:00.000Z").getTime();
        const isNotRefund = String(t?.status || "").toLowerCase() !== "refund";
        return isNotRefund && inInclusiveRange(ms, fromMs, toMs);
      })
      .reduce((acc, t) => acc + lineTotal(t), 0);
  }

  return 0;
};

/* KPIs computed from createdAt-first sources, then revenue overridden with exact */
const computeKPIsByCreatedAt = async (startISO, endISO) => {
  const { fromISO, toISO, fromMs, toMs } = getRange(startISO, endISO);

  const txList = await getFirstArray([
    `/transactions?start=${encodeURIComponent(fromISO)}&end=${encodeURIComponent(toISO)}`,
    `/transactions`,
  ]);
  const revenue = txList
    .filter((t) => {
      const raw = t?.createdAt || t?.date || null;
      if (!raw) return false;
      const ms = new Date(isoDateOnly(raw) + "T12:00:00.000Z").getTime();
      return inInclusiveRange(ms, fromMs, toMs) && String(t?.status || "").toLowerCase() !== "refund";
    })
    .reduce((acc, t) => acc + lineTotal(t), 0);

  /* ✅ Use the exact same total as the dashboard first */
  const expenses = toNum(await fetchDashboardExpensesTotal(fromISO, toISO), 0);

  const net = revenue - expenses;

  return { revenue, expenses, net };
};

/* Month-end helpers for Balance Sheet */
const endOfMonthISO = (dLike) => {
  const d = new Date(dLike);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0));
  return fmtDate(last);
};
const sameUTCMonth = (aISO, bISO) => normalizeMonthKey(aISO) === normalizeMonthKey(bISO);

const monthEndOrToday = (iso) => {
  const today = fmtDate(new Date());
  return sameUTCMonth(iso, today) ? today : endOfMonthISO(iso);
};
// remove monthEndOrToday and sameUTCMonth (no longer needed for the PDF)

const getTwoMonthAsOfs = (fromISO, toISO) => {
  const leftAsOf  = isoDateOnly(fromISO); // EXACT selected start date
  const rightAsOf = isoDateOnly(toISO);   // EXACT selected end date
  return {
    leftAsOf,
    rightAsOf,
    sameMonth: normalizeMonthKey(leftAsOf) === normalizeMonthKey(rightAsOf),
  };
};


/* ───────── component ───────── */
function FinancialReport() {
  const revenueRef = useRef(null);
  const expenseRef = useRef(null);
  const profitRef = useRef(null);
  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);

  const [reportType, setReportType] = useState("All Reports");
  const [generating, setGenerating] = useState(false);

  const [dash, setDash] = useState({ revenue: 0, expenses: 0, net: 0 });
  const [revenueExact, setRevenueExact] = useState(0);

  const [balanceCard, setBalanceCard] = useState({
    assets: 0,
    liabilities: 0,
    equity: 0,
  });

  const [chartsData, setChartsData] = useState({
    revenueMonthly: { labels: [], values: [] },
    expenseByCategory: { labels: [], values: [] },
    profitMarginMonthly: { labels: [], values: [] },
  });

  const getWithRange = async (base, fromISO, toISO) => {
    const qs =
      fromISO && toISO ? `?start=${encodeURIComponent(fromISO)}&end=${encodeURIComponent(toISO)}` : "";
    try {
      const { data } = await api.get(`${base}${qs}`);
      return data ?? null;
    } catch {
      try {
        const { data } = await api.get(base);
        return data ?? null;
      } catch {
        return null;
      }
    }
  };

  useEffect(() => {
    const today = new Date();
    const todayISO = fmtDate(today);
    const first = new Date(today.getFullYear(), today.getMonth(), 1);

    if (dateFromRef.current) dateFromRef.current.valueAsDate = first;
    if (dateToRef.current) {
      dateToRef.current.valueAsDate = today;
      dateToRef.current.min = fmtDate(first);
      dateToRef.current.max = todayISO;
    }

    setTimeout(
      () => toast("Welcome to Financial Reports! Generate and download your reports here.", "success"),
      300
    );

    const load = async () => {
      const fromISO = dateFromRef.current?.value || fmtDate(first);
      const toISO = dateToRef.current?.value || todayISO;

      const exact = await fetchExactRevenue(fromISO, toISO);
      setRevenueExact(exact);

      let kpis = await computeKPIsByCreatedAt(fromISO, toISO);

      if (kpis.revenue === 0 && kpis.expenses === 0) {
        const txSummary = await getWithRange("/transactions/summary", fromISO, toISO);

        // ✅ get exact dashboard expenses total first
        const expensesDash = await fetchDashboardExpensesTotal(fromISO, toISO);

        // fallback revenue from summary (if any)
        const revenue = toNum(txSummary?.revenue, 0);

        kpis = { revenue, expenses: toNum(expensesDash, 0), net: revenue - toNum(expensesDash, 0) };
      }

      const finalRevenue = Number.isFinite(Number(exact)) ? exact : kpis.revenue;
      const finalExpenses = toNum(await fetchDashboardExpensesTotal(fromISO, toISO), toNum(kpis.expenses, 0));
      const finalNet = finalRevenue - finalExpenses;
      setDash({ revenue: finalRevenue, expenses: finalExpenses, net: finalNet });

      await refreshBalanceCard(toISO);
      await fetchChartsData();
    };

    load();
  }, []);

  const fetchIncomeStatementData = async (startISO, endISO) => {
    const revenueTotal = Number.isFinite(Number(revenueExact)) ? revenueExact : toNum(dash.revenue, 0);
    const netIncomeCard = toNum(dash.net, 0);

    // Pull the same buckets the dashboard uses (and keep as fallback in one place)
    const exp = await fetchExpensesRange(startISO, endISO);
    const salaryNet = toNum(exp?.breakdown?.payroll, 0);
    const epfEtf = toNum(exp?.breakdown?.contrib, 0);
    const cogsInventory = toNum(exp?.breakdown?.inventory, 0);

    const grossProfit = revenueTotal - cogsInventory;
    const operatingTotal = Math.max(grossProfit - netIncomeCard, 0);

    const website = Math.max(operatingTotal - (salaryNet + epfEtf), 0);
    const internet = 0;

    return {
      revenue: { total: revenueTotal },
      cogs: { inventory: cogsInventory, total: cogsInventory },
      opex: { salary: salaryNet, epfEtf, website, internet, total: operatingTotal },
      grossProfit,
      netIncome: netIncomeCard,
    };
  };

  const fetchChartsData = async () => {
    const todayISO = fmtDate(new Date());
    const fromISO = dateFromRef.current?.value || todayISO;
    let toISO = dateToRef.current?.value || todayISO;

    if (toISO > todayISO) {
      toISO = todayISO;
      if (dateToRef.current) dateToRef.current.value = todayISO;
      toast("Date To adjusted to today (future dates are not allowed).", "warning");
    }

    const { fromMs, toMs } = getRange(fromISO, toISO);
    const { keys: monthKeys, labels: monthLabels } = generateMonthRange(fromISO, toISO, 12);
    const qs = `?start=${encodeURIComponent(isoDateOnly(fromISO))}&end=${encodeURIComponent(isoDateOnly(toISO))}`;

    const tryGet = async (path, fallback = null) => {
      try {
        const { data } = await api.get(path);
        return data ?? fallback;
      } catch {
        return fallback;
      }
    };

    const revenueMonthly = await (async () => {
      const c1 = await tryGet(`/analytics/revenue/monthly${qs}`);
      const c2 = c1 || (await tryGet(`/transactions/revenue/monthly${qs}`));
      const c3 = c2 || (await tryGet(`/reports/revenue/monthly${qs}`));
      let map = {};
      if (Array.isArray(c3?.series) && c3.series.length) {
        c3.series.forEach((r) => {
          const k = `${r.y}-${String(r.m).padStart(2, "0")}`;
          map[k] = (map[k] || 0) + toNum(r?.revenue);
        });
      } else if (Array.isArray(c3) && c3.length) {
        c3.forEach((r) => {
          const kRaw = r?.key ?? r?.month ?? r?.date ?? new Date();
          const k = normalizeMonthKey(kRaw);
          map[k] = (map[k] || 0) + toNum(r?.revenue ?? r?.total ?? r?.value);
        });
      } else {
        const tx = await tryGet(`/transactions${qs}`, []);
        if (Array.isArray(tx) && tx.length) {
          tx
            .filter((t) => {
              const raw = t?.createdAt || t?.date || null;
              if (!raw) return false;
              const ms = new Date(isoDateOnly(raw) + "T12:00:00.000Z").getTime();
              return inInclusiveRange(ms, fromMs, toMs) && String(t?.status || "").toLowerCase() !== "refund";
            })
            .forEach((t) => {
              const rawDate = t?.createdAt || t?.date || Date.now();
              const k = normalizeMonthKey(rawDate);
              map[k] = (map[k] || 0) + lineTotal(t);
            });
        }
      }
      const values = monthKeys.map((k) => map[k] || 0);
      return { labels: monthLabels, values };
    })();

    const expenseByCategory = await (async () => {
      const d1 = await tryGet(`/dashboard/expenses/categories${qs}`);
      if (Array.isArray(d1) && d1.length) {
        return {
          labels: d1.map((x) => x?.category ?? x?.name ?? x?.label ?? "Other"),
          values: d1.map((x) => toNum(x?.amount ?? x?.total ?? x?.value ?? 0)),
        };
      }
      const d2 = await tryGet(`/dashboard${qs}`);
      const list = d2?.expenses?.categories || d2?.cards?.expenses?.breakdown || d2?.categories;
      if (Array.isArray(list) && list.length) {
        return {
          labels: list.map((x) => x?.category ?? x?.name ?? x?.label ?? "Other"),
          values: list.map((x) => toNum(x?.amount ?? x?.total ?? x?.value ?? 0)),
        };
      }
      // fallback to our three-bucket composition used by dashboard cards
      const exp = await fetchExpensesRange(isoDateOnly(fromISO), isoDateOnly(toISO));
      return {
        labels: ["Payroll", "EPF/ETF", "Inventory"],
        values: [
          toNum(exp?.breakdown?.payroll, 0),
          toNum(exp?.breakdown?.contrib, 0),
          toNum(exp?.breakdown?.inventory, 0),
        ],
      };
    })();

    const profitMarginMonthly = await (async () => {
      const pm = await tryGet(`/analytics/profit-margin/monthly${qs}`);
      if (Array.isArray(pm) && pm.length) {
        const map = {};
        pm.forEach((r) => {
          const k = normalizeMonthKey(r?.key || r?.month);
          if (k) map[k] = toNum(r?.margin ?? r?.value ?? 0);
        });
        return { labels: monthLabels, values: monthKeys.map((k) => map[k] ?? 0) };
      }
      const cogsMonthly = await tryGet(`/finance/cogs/monthly${qs}`);
      const opexMonthly = await tryGet(`/finance/operating-expenses/monthly${qs}`);
      const cogsMap = mapFromArray(cogsMonthly, ["month", "key", "date"], ["total", "value"]);
      const opexMap = mapFromArray(opexMonthly, ["month", "key", "date"], ["total", "value"]);
      const values = monthKeys.map((k, i) => {
        const rev = revenueMonthly.values[i] || 0;
        const cogs = cogsMap[k] || 0;
        const opex = opexMap[k] || 0;
        return rev ? Math.round(((rev - cogs - opex) / rev) * 1000) / 10 : 0;
      });
      return { labels: monthLabels, values };
    })();

    setChartsData({ revenueMonthly, expenseByCategory, profitMarginMonthly });
  };

  const chartInstances = useRef({});

  const mountChart = (key, cfg) => {
    const el =
      {
        revenue: revenueRef,
        expense: expenseRef,
        profit: profitRef,
      }[key]?.current;

    if (!el) return;
    try {
      if (chartInstances.current[key]) {
        chartInstances.current[key].destroy();
        chartInstances.current[key] = null;
      }
      const ctx = el.getContext("2d");
      chartInstances.current[key] = new Chart(ctx, cfg);
    } catch {}
  };

  useEffect(() => {
    const c = chartsData;
    const safe = (arr) => (Array.isArray(arr) && arr.length ? arr : [""]);

    mountChart("revenue", {
      type: "line",
      data: {
        labels: safe(c.revenueMonthly.labels),
        datasets: [
          {
            label: "Revenue",
            data: safe(c.revenueMonthly.values),
            borderColor: "#1f7ed6",
            backgroundColor: "rgba(31,126,214,0.12)",
            borderWidth: 3,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => "LKR " + (v / 1000).toLocaleString("en-LK") + "K" },
          },
        },
      },
    });

    mountChart("expense", {
      type: "doughnut",
      data: {
        labels: safe(c.expenseByCategory.labels.map(titleCase)),
        datasets: [
          {
            data: safe(c.expenseByCategory.values),
            backgroundColor: ["#1f7ed6", "#79a7e3", "#a8c6f0", "#d7e6fb", "#6ec1c2", "#f7b267", "#ef5d60"],
            borderWidth: 0,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { padding: 15, usePointStyle: true, font: { size: 10 } } },
        },
        cutout: "62%",
      },
    });

    mountChart("profit", {
      type: "bar",
      data: {
        labels: safe(c.profitMarginMonthly.labels),
        datasets: [
          {
            label: "Profit Margin %",
            data: safe(c.profitMarginMonthly.values),
            backgroundColor: "#16a34a",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + "%" } } },
      },
    });

    return () => {
      Object.values(chartInstances.current || {}).forEach((ch) => {
        try { ch?.destroy(); } catch {}
      });
      chartInstances.current = {};
    };
  }, [chartsData]);

  const inferType = (name) =>
    /profit|loss/i.test(name) ? "Profit & Loss Statement" : /balance/i.test(name) ? "Balance Sheet" : "Report";

  const fetchBalanceSnapshot = async (asOfISO) => {
    const params = asOfISO ? `?end=${encodeURIComponent(asOfISO)}` : "";

    const inv = await safeGet(`/inventory/summary${params}`, {});
    const prod = await safeGet(`/products/summary${params}`, {});
    const inventoryValue = toNum(inv?.inventory?.totalValue ?? inv?.totalValue ?? 0);
    const productsValue = toNum(prod?.totalValue ?? 0);

    const cash = await safeGet(`/finance/cash-summary${params}`, { total: 0 });

    let receivables = await safeGet(`/finance/receivables/summary${params}`, null);
    if (!receivables || !Number.isFinite(Number(receivables?.total))) {
      const fromMin = "1970-01-01";
      const txList = await safeGet(
        `/transactions?start=${encodeURIComponent(fromMin)}&end=${encodeURIComponent(asOfISO)}`,
        []
      );
      const totalPending = Array.isArray(txList)
        ? txList
            .filter((t) => {
              const st = String(t?.status || "").toLowerCase();
              const isPending = st === "pending";
              const d = isoDateOnly(t?.createdAt || t?.date || "");
              const ms = d ? new Date(d + "T12:00:00.000Z").getTime() : NaN;
              const asOfMs = new Date(isoDateOnly(asOfISO) + "T23:59:59.999Z").getTime();
              return isPending && Number.isFinite(ms) && ms <= asOfMs;
            })
            .reduce((acc, t) => acc + lineTotal(t), 0)
        : 0;
      receivables = { total: totalPending, count: 0 };
    }

    const fixed = await safeGet(`/finance/fixed-assets${params}`, { total: 0 });

    let payables = await safeGet(`/finance/payables/summary${params}`, null);
    if (!payables || !Number.isFinite(Number(payables?.total))) {
      const pur = await safeGet(`/purchases?status=approved`, { orders: [] });
      const orders = Array.isArray(pur?.orders) ? pur.orders : [];
      const invList = await safeGet(`/inventory`, { items: [] });
      const items = Array.isArray(invList?.items) ? invList.items : [];

      const unitById = new Map();
      items.forEach((it) =>
        unitById.set(String(it?.id || "").trim(), toNum(it?.unitPrice ?? it?.costPrice ?? it?.price, 0))
      );

      const totalAP = orders
        .filter((o) => {
          const d = isoDateOnly(o?.orderDate || o?.createdAt || "");
          const ms = d ? new Date(d + "T12:00:00.000Z").getTime() : NaN;
          const asOfMs = new Date(isoDateOnly(asOfISO) + "T23:59:59.999Z").getTime();
          return Number.isFinite(ms) && ms <= asOfMs && String(o?.status).toLowerCase() === "approved";
        })
        .reduce((acc, o) => {
          const unit = unitById.get(String(o?.itemId || "").trim()) || 0;
          const qty = toNum(o?.quantity, 0);
          return acc + unit * qty;
        }, 0);

      payables = { total: totalAP, count: 0 };
    }

    const revenue = await safeGet(`/transactions/revenue${params}`, { revenue: 0 });
    const cogs = await safeGet(`/finance/cogs${params}`, { total: 0 });
    const payroll = await safeGet(`/salary/summary${params}`, { totalNet: 0 });
    const contrib = await safeGet(`/contributions/summary${params}`, { grandTotal: 0 });
    const opex = await safeGet(`/finance/other-expenses${params}`, { website: 0, total: 0 });

    const cashBank = toNum(cash?.total);
    const ar = toNum(receivables?.total);
    const invBags = inventoryValue + productsValue;
    const websiteTools = toNum(fixed?.total);

    const ap = toNum(payables?.total);
    let accrued = 0;
    const accr = await safeGet(`/finance/other-liabilities${params}`, null);
    if (accr && Number.isFinite(Number(accr?.total))) {
      accrued = Number(accr.total);
    } else {
      accrued = Math.max(0, toNum(payroll?.totalNet, 0) + toNum(contrib?.grandTotal, 0));
    }

    const salesRevenue = toNum(revenue?.revenue);
    const costOfGoods = toNum(cogs?.total);
    const salaryNet = toNum(payroll?.totalNet);
    const epfEtf = toNum(contrib?.grandTotal);
    const websiteExp = toNum(opex?.website ?? opex?.total ?? 0);
    const totalExpenses = costOfGoods + salaryNet + epfEtf + websiteExp;
    const netProfit = salesRevenue - totalExpenses;

    const ownerCapitalRaw = await safeGet(`/finance/equity/capital${params}`, { total: 0 });
    const ownerCapital = toNum(ownerCapitalRaw?.total, 0);

    const totalCurrentAssets = cashBank + ar + invBags;
    const totalNonCurrentAssets = websiteTools;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const totalCurrentLiabilities = ap + accrued;
    const totalLiabilities = totalCurrentLiabilities;

    let retainedEarnings = toNum(netProfit, 0);
    let equityFromParts = ownerCapital + retainedEarnings;
    const equityByEquation = totalAssets - totalLiabilities;

    if (!Number.isFinite(equityFromParts) || Math.abs(equityFromParts - equityByEquation) > 1) {
      retainedEarnings = equityByEquation - ownerCapital;
      equityFromParts = equityByEquation;
    }

    const totalShareholdersEquity = equityFromParts;
    const totalLiaPlusEq = totalLiabilities + totalShareholdersEquity;

    return {
      asOf: asOfISO || fmtDate(new Date()),
      assets: {
        cashBank,
        ar,
        invBags,
        totalCurrentAssets,
        totalNonCurrentAssets,
        totalAssets,
        websiteTools,
      },
      liabilities: {
        ap,
        accrued,
        totalCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        ownerCapital,
        retainedEarnings,
        totalShareholdersEquity,
        totalLiaPlusEq,
      },
    };
  };

  const refreshBalanceCard = async (asOfISO) => {
    try {
      const snap = await fetchBalanceSnapshot(asOfISO || fmtDate(new Date()));
      const a = toNum(snap?.assets?.totalAssets, 0);
      const l = toNum(snap?.liabilities?.totalLiabilities, 0);
      const e = a - l;
      setBalanceCard({ assets: a, liabilities: l, equity: e });
    } catch {}
  };

  const getTwoMonthData = async (fromISO, toISO) => {
    const { leftAsOf, rightAsOf } = getTwoMonthAsOfs(fromISO, toISO);
    const left = await fetchBalanceSnapshot(leftAsOf);
    const right = await fetchBalanceSnapshot(rightAsOf);
    return { left, right };
  };

  const formatHeaderDate = (iso) => {
    const d = new Date(iso);
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const buildBalanceSheetHTML = (companyName, left, right) => {
    const v = (n) => fmtLKRNum(n);
    const leftDate = formatHeaderDate(left.asOf);
    const rightDate = formatHeaderDate(right.asOf);
    const logoUrl = `${window.location.origin}/new logo.png`;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${companyName} – Balance Sheet</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css">
<style>
  :root{--ink:#1f2937;--muted:#475569;--line:#d9b24d;}
  body{background:#f6f7fb;margin:0;padding:22px;font-family:Georgia,'Times New Roman',serif;}
  .page{max-width:900px;margin:0 auto;background:#fff;padding:26px 26px 32px;border:1px solid #eee;}
  .brand{display:flex;justify-content:space-between;align-items:center}
  .logo{width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid #e6e6e6}
  .title{font-size:22px;font-weight:800;color:#2c2c2c}
  .meta{font-size:12px;color:#666;margin-top:2px}
  .rule{height:3px;background:var(--line);margin:16px 0 24px 0}
  h2.sheet{font-size:18px;text-align:center;margin:0 0 8px 0;letter-spacing:.4px}
  .date-row{display:flex;justify-content:flex-end;gap:40px;color:#333;font-weight:700;margin:10px 0 6px 0}

  /* --- TABLE ALIGNMENT FIX --- */
  table{
    width:100%;
    border-collapse:collapse;
    table-layout:fixed;               /* keep column widths consistent across both tables */
  }
  td{
    padding:6px 12px;
    font-size:14px;
    color:#222;
    vertical-align:top;
  }
  td:first-child{
    width:auto;                       /* labels stretch */
  }
  td:nth-child(2),
  td:nth-child(3){
    width:190px;                      /* fixed numeric columns for left/right dates */
    text-align:right;
    white-space:nowrap;               /* keep LKR values on one line */
  }

  .section{font-weight:700}
  .sub{padding-left:14px}
  .right{text-align:right;}           /* keep for explicit cells, no min-width so it doesn't shift columns */
  .total{border-top:1px solid #bbb;font-weight:700}
  .divider{height:1px;background:#bbb;margin:10px 0}
</style>

</head>
<body>
  <div class="page">
    <div class="brand">
      <img src="${logoUrl}" alt="PackPal Logo" class="logo" />
      <div style="text-align:right">
        <div class="title">${companyName}</div>
        <div class="meta">No. 42, Elm Street, Colombo • +94 11 234 5678 • hello@packpal.lk</div>
      </div>
    </div>
    <div class="rule"></div>
    <h2 class="sheet">BALANCE SHEET</h2>
    <div class="date-row">
      <div>${leftDate}</div>
      <div>${rightDate}</div>
    </div>
    <div class="divider"></div>

    <table>
      <tbody>
        <tr><td class="section">ASSETS:</td><td></td><td></td></tr>
        <tr><td class="section sub">Current assets:</td><td></td><td></td></tr>
        <tr><td class="sub">Accounts Receivable</td><td class="right">${left.assets.ar ? "LKR "+v(left.assets.ar) : "-"}</td><td class="right">${right.assets.ar ? "LKR "+v(right.assets.ar) : "-"}</td></tr>
        <tr><td class="sub">Inventory (Bags in stock)</td><td class="right">LKR ${v(left.assets.invBags)}</td><td class="right">LKR ${v(right.assets.invBags)}</td></tr>
        <tr><td class="sub section">Total current assets</td><td class="right section">LKR ${v(left.assets.totalCurrentAssets)}</td><td class="right section">LKR ${v(right.assets.totalCurrentAssets)}</td></tr>

        <tr><td class="section sub" style="padding-top:10px">Non-current assets:</td><td></td><td></td></tr>
        <tr><td class="sub">Website Software &amp; Tools</td><td class="right">${left.assets.websiteTools ? "LKR "+v(left.assets.websiteTools) : "LKR 0"}</td><td class="right">${right.assets.websiteTools ? "LKR "+v(right.assets.websiteTools) : "LKR 0"}</td></tr>
        <tr><td class="sub section">Total non-current assets</td><td class="right section">${left.assets.totalNonCurrentAssets ? "LKR "+v(left.assets.totalNonCurrentAssets) : "LKR 0"}</td><td class="right section">${right.assets.totalNonCurrentAssets ? "LKR "+v(right.assets.totalNonCurrentAssets) : "LKR 0"}</td></tr>

        <tr><td class="section total" style="padding-top:8px"><strong>Total assets</strong></td><td class="right total"><strong>LKR ${v(left.assets.totalAssets)}</strong></td><td class="right total"><strong>LKR ${v(right.assets.totalAssets)}</strong></td></tr>
      </tbody>
    </table>

    <div class="divider" style="margin:16px 0"></div>

    <table>
      <tbody>
        <tr><td class="section">LIABILITIES AND SHAREHOLDERS' EQUITY:</td><td></td><td></td></tr>

        <tr><td class="section sub">Current liabilities:</td><td></td><td></td></tr>
        <tr><td class="sub">Accounts Payable (suppliers)</td><td class="right">LKR ${v(left.liabilities.ap)}</td><td class="right">LKR ${v(right.liabilities.ap)}</td></tr>
        <tr><td class="sub">Accrued Expenses (ads, hosting)</td><td class="right">LKR ${v(left.liabilities.accrued)}</td><td class="right">LKR ${v(right.liabilities.accrued)}</td></tr>
        <tr><td class="sub section">Total current liabilities</td><td class="right section">LKR ${v(left.liabilities.totalCurrentLiabilities)}</td><td class="right section">LKR ${v(right.liabilities.totalCurrentLiabilities)}</td></tr>

        <tr><td class="section">Total liabilities</td><td class="right">LKR ${v(left.liabilities.totalLiabilities)}</td><td class="right">LKR ${v(right.liabilities.totalLiabilities)}</td></tr>

        <tr><td class="section sub" style="padding-top:10px">Shareholders' equity:</td><td></td><td></td></tr>
        <tr><td class="sub">Owner's Capital</td><td class="right">LKR ${v(left.equity.ownerCapital)}</td><td class="right">LKR ${v(right.equity.ownerCapital)}</td></tr>
        <tr><td class="sub">Retained Earnings</td><td class="right">LKR ${v(left.equity.retainedEarnings)}</td><td class="right">LKR ${v(right.equity.retainedEarnings)}</td></tr>
        <tr><td class="sub section">Total shareholders' equity</td><td class="right section">LKR ${v(left.equity.totalShareholdersEquity)}</td><td class="right section">LKR ${v(right.equity.totalShareholdersEquity)}</td></tr>

        <tr><td class="section total" style="padding-top:8px"><strong>Total liabilities and shareholders' equity</strong></td><td class="right total"><strong>LKR ${v(left.equity.totalLiaPlusEq)}</strong></td><td class="right total"><strong>LKR ${v(right.equity.totalLiaPlusEq)}</strong></td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
  };

  const buildIncomeStatementHTML = (companyName, asOf, pl) => {
    const v = (n) => fmtLKRNum(n);
    const periodText = new Date(asOf).toLocaleString("en-US", { month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/new logo.png`;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${companyName} – Profit & Loss</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css">
<style>
:root{ --ink:#222; --muted:#6b7280; --grid:#e6eef9; --brand:#1f7ed6; --band:#eaf2fd; }
*{box-sizing:border-box}
body{background:#ffffff;margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial}
.page{max-width:820px;margin:0 auto;border:1px solid var(--grid)}
.header{display:flex;align-items:center;gap:16px;padding:18px;border-bottom:6px solid var(--grid)}
.logo{width:54px;height:54px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px #f2f6ff inset}
.head-right{flex:1}
.company{margin:0;font-size:26px;font-weight:800;color:#111;text-align:right}
.meta{margin-top:4px;text-align:right;color:#475569;font-size:13px}
.section-title{background:var(--band);border:1px solid var(--grid);border-left:0;border-right:0;padding:10px 16px;font-weight:800}
.tbl{width:100%;border-collapse:separate;border-spacing:0 0;border-top:1px solid var(--grid)}
.tbl th,.tbl td{padding:10px 16px;border-bottom:1px solid #eef2f7;font-size:14px}
.tbl th{color:#111;background:#f6f9ff;font-weight:800}
.right{text-align:right}
.total{font-weight:800}
.note{color:#64748b;font-size:12px;padding:16px}
@media print{body{padding:0}.page{border:none}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img class="logo" src="${logoUrl}" alt="logo" onerror="this.style.display='none'"/>
    <div class="head-right">
      <h1 class="company">${companyName}</h1>
      <div class="meta">No. 42, Elm Street, Colombo • +94 11 234 5678 • hello@packpal.lk</div>
    </div>
  </div>

  <div class="section-title">Profit &amp; Loss Statement — ${periodText}</div>

  <div class="section-title" style="margin-top:12px">Revenue</div>
  <table class="tbl"><tbody>
    <tr><td>Sales Revenue</td><td class="right total">LKR ${v(pl.revenue.total)}</td></tr>
  </tbody></table>

  <div class="section-title" style="margin-top:12px">Cost of Goods Sold (COGS)</div>
  <table class="tbl"><tbody>
    <tr><td>Cost of Goods Sold</td><td class="right">LKR ${v(pl.cogs.inventory)}</td></tr>
    <tr><td class="total">Total COGS</td><td class="right total">LKR ${v(pl.cogs.total)}</td></tr>
  </tbody></table>

  <table class="tbl"><tbody>
    <tr><td class="total">Gross Profit</td><td class="right total">LKR ${v(pl.grossProfit)}</td></tr>
  </tbody></table>

  <div class="section-title" style="margin-top:12px">Operating Expenses</div>
  <table class="tbl"><tbody>
    <tr><td>Employee Salaries</td><td class="right">LKR ${v(pl.opex.salary)}</td></tr>
    <tr><td>EPF & ETF</td><td class="right">LKR ${v(pl.opex.epfEtf)}</td></tr>
    <tr><td>Website</td><td class="right">LKR ${v(pl.opex.website)}</td></tr>
    <tr><td>Internet & Utilities</td><td class="right">LKR ${v(pl.opex.internet)}</td></tr>
    <tr><td class="total">Total Operating Expenses</td><td class="right total">LKR ${v(pl.opex.total)}</td></tr>
  </tbody></table>

  <table class="tbl"><tbody>
    <tr><td class="total">Net Profit / (Loss)</td><td class="right total">LKR ${v(pl.netIncome)}</td></tr>
  </tbody></table>

  <div class="note">Note: Revenue, charts, and cards all use the same inclusive date range with timezone-safe comparisons.</div>
</div>
</body>
</html>`;
  };

  const openHTML = (html, filename) => {
    const w = window.open("", "_blank");
    if (w && !w.closed) {
      w.document.write(html);
      w.document.close();
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleView = async (name) => {
    const type = inferType(name);
    const from = dateFromRef.current?.value || fmtDate(new Date());
    const to = dateToRef.current?.value || fmtDate(new Date());

    if (type === "Balance Sheet") {
      const { left, right } = await getTwoMonthData(from, to);
      const html = buildBalanceSheetHTML("PackPal (Pvt) Ltd", left, right);
      openHTML(html, `Balance_Sheet_${right.asOf}.html`);
      return;
    }

    if (type === "Profit & Loss Statement") {
      const pl = await fetchIncomeStatementData(from, to);
      const html = buildIncomeStatementHTML("PackPal (Pvt) Ltd", to, pl);
      openHTML(html, `Profit_and_Loss_${to}.html`);
      return;
    }

    const html = `<html><body><h2>${name}</h2><p>Period: ${from} to ${to}</p></body></html>`;
    openHTML(html, `${name.replace(/\s+/g, "_")}.html`);
  };

  const handleDownload = async (name) => {
    const type = inferType(name);
    const from = dateFromRef.current?.value || fmtDate(new Date());
    const to = dateToRef.current?.value || fmtDate(new Date());

    if (type === "Balance Sheet") {
      const { left, right } = await getTwoMonthData(from, to);
      const html = buildBalanceSheetHTML("PackPal (Pvt) Ltd", left, right);
      openHTML(html, `Balance_Sheet_${right.asOf}.html`);
      toast("Balance Sheet generated. Use the browser’s Print to save as PDF.", "success");
      return;
    }

    if (type === "Profit & Loss Statement") {
      const pl = await fetchIncomeStatementData(from, to);
      const html = buildIncomeStatementHTML("PackPal (Pvt) Ltd", to, pl);
      openHTML(html, `Profit_and_Loss_${to}.html`);
      toast("Profit & Loss generated. Use the browser’s Print to save as PDF.", "success");
      return;
    }

    toast("Report ready.", "success");
  };

  const quickCards = useMemo(
    () => [
      {
        title: "Profit & Loss Statement",
        subtitle: "Period performance snapshot",
        stats: [
          { label: "Revenue", value: fmtLKR(revenueExact || dash.revenue) },
          { label: "Expenses", value: fmtLKR(dash.expenses) },
          { label: "Net Profit", value: fmtLKR((revenueExact || dash.revenue) - toNum(dash.expenses, 0)) },
        ],
      },
      {
        title: "Balance Sheet",
        subtitle: "Assets & Liabilities",
        stats: [
          { label: "Assets", value: fmtLKR(balanceCard.assets) },
          { label: "Liabilities", value: fmtLKR(balanceCard.liabilities) },
          { label: "Equity", value: fmtLKR(balanceCard.assets - balanceCard.liabilities) },
        ],
      },
    ],
    [dash, balanceCard, revenueExact]
  );

  const handleGenerate = async () => {
    const todayISO = fmtDate(new Date());
    const from = dateFromRef.current?.value || todayISO;
    let to = dateToRef.current?.value || todayISO;

    if (to > todayISO) {
      to = todayISO;
      if (dateToRef.current) dateToRef.current.value = todayISO;
      toast("Date To adjusted to today (future dates are not allowed).", "warning");
    }
    if (from && to && to < from) {
      to = from;
      if (dateToRef.current) dateToRef.current.value = from;
      dateToRef.current.min = from;
      toast("Adjusted Date To to match Date From (cannot be earlier).", "warning");
    }

    const reload = async () => {
      const exact = await fetchExactRevenue(from, to);
      setRevenueExact(exact);

      let kpis = await computeKPIsByCreatedAt(from, to);
      if (kpis.revenue === 0 && kpis.expenses === 0) {
        const txSummary = await getWithRange("/transactions/summary", from, to);
        const revenue = toNum(txSummary?.revenue, 0);

        const expensesDash = await fetchDashboardExpensesTotal(from, to);
        kpis = { revenue, expenses: toNum(expensesDash, 0), net: revenue - toNum(expensesDash, 0) };
      }
      const finalRevenue = Number.isFinite(Number(exact)) ? exact : kpis.revenue;

      // ✅ force expenses to dashboard exact total (with fallback)
      const finalExpenses = toNum(await fetchDashboardExpensesTotal(from, to), toNum(kpis.expenses, 0));

      const finalNet = finalRevenue - finalExpenses;
      setDash({ revenue: finalRevenue, expenses: finalExpenses, net: finalNet });
    };

    setGenerating(true);
    await Promise.all([reload(), fetchChartsData(), refreshBalanceCard(to)]);
    setGenerating(false);
    toast(
      `${reportType} generated successfully for ${dateFromRef.current?.value || from} to ${
        dateToRef.current?.value || to
      }`,
      "success"
    );
  };

  const todayISO = fmtDate(new Date());
  return (
    <div className="financial-report-page">
      <Sidebar />

      <main className="main-content">
        <div className="content-header">
          <h1> Financial Reports</h1>
          <p>Comprehensive financial analysis and reporting</p>
        </div>

        <section className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Report Type</label>
              <select className="filter-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option>All Reports</option>
                <option>Profit & Loss Statement</option>
                <option>Balance Sheet</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Date From</label>
              <input
                type="date"
                className="filter-input"
                ref={dateFromRef}
                max={todayISO}
                onChange={(e) => {
                  const fromDate = e.target.value;
                  if (dateToRef.current) {
                    dateToRef.current.min = fromDate;
                    dateToRef.current.max = todayISO;
                    if (dateToRef.current.value && dateToRef.current.value < fromDate) {
                      dateToRef.current.value = fromDate;
                    }
                    if (dateToRef.current.value && dateToRef.current.value > todayISO) {
                      dateToRef.current.value = todayISO;
                      toast("Date To adjusted to today (future dates are not allowed).", "warning");
                    }
                  }
                }}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Date To</label>
              <input
                type="date"
                className="filter-input"
                ref={dateToRef}
                max={todayISO}
                onChange={(e) => {
                  const v = e.target.value;
                  const max = todayISO;
                  const min = dateFromRef.current?.value || "";
                  if (min && v < min) {
                    e.target.value = min;
                    toast("Date To cannot be earlier than Date From. Adjusted.", "warning");
                  } else if (v > max) {
                    e.target.value = max;
                    toast("Date To adjusted to today (future dates are not allowed).", "warning");
                  }
                }}
              />
            </div>

            <div className="filter-group">
              <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chart-bar" /> Generate Reports
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Cards filtered by reportType */}
        <section className={`reports-grid ${reportType !== "All Reports" ? "centered" : ""}`}>
          {quickCards
            .filter((card) => reportType === "All Reports" || card.title === reportType)
            .map((card) => (
              <article className="report-card" key={card.title}>
                <div className="report-header">
                  <div className="report-title">
                    {card.title.includes("Profit") && <i className="fas fa-file-invoice-dollar" />}
                    {card.title.includes("Balance") && <i className="fas fa-balance-scale" />}
                    {card.title}
                  </div>
                  <div className="report-subtitle">{card.subtitle}</div>
                </div>
                <div className="report-body">
                  <div className="report-summary">
                    {card.stats.map((s) => (
                      <div className="summary-item" key={s.label}>
                        <div className="summary-value">{s.value}</div>
                        <div className="summary-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="report-actions">
                    <button className="action-btn btn-primary" onClick={() => handleView(card.title)}>
                      <i className="fas fa-eye" /> View
                    </button>
                    <button className="action-btn btn-secondary" onClick={() => handleDownload(card.title)}>
                      <i className="fas fa-download" /> Download
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </section>

        <section className="chart-section">
          <h2 className="section-title">📈 Financial Performance Analytics</h2>
          <div className="charts-row">
            <div className="chart-container">
              <div className="chart-title">Monthly Revenue Trend</div>
              <canvas ref={revenueRef} />
            </div>
            <div className="chart-container">
              <div className="chart-title">Expense Categories</div>
              <canvas ref={expenseRef} />
            </div>
          </div>

          <div className="charts-row one">
            <div className="chart-container">
              <div className="chart-title">Profit Margin Analysis</div>
              <canvas ref={profitRef} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FinancialReport;
