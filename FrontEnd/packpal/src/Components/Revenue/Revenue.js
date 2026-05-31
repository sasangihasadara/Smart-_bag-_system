// src/Components/Revenue/Revenue.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./Revenue.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { api } from "../../lib/api";

/* ========== utils ========== */
const fmtLKRNum = (n) => Math.round(Number(n || 0)).toLocaleString("en-LK");
const fmtLKR = (n) => "LKR " + fmtLKRNum(n);
const numStr = (n) => Math.round(Number(n || 0)).toLocaleString("en-LK");
const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Use /public/logo.png (place logo.png in the public folder)
const INVOICE_LOGO = `${process.env.PUBLIC_URL || ""}/new logo.png`;

// Local YYYY-MM-DD (no timezone shifting)
const pad2 = (n) => String(n).padStart(2, "0");
const localISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* compute line total for a transaction doc */
const lineTotal = (t) => {
  const q  = toNum(t?.qty ?? t?.quantity, 0);
  const p  = toNum(t?.unitPrice ?? t?.price, 0);
  const d  = toNum(t?.discountPerUnit ?? t?.discount, 0);
  const tt = t?.total;
  const calc = q * p - q * d;
  const num = toNum(tt, null);
  return Number.isFinite(num) ? num : calc;
};

/* sum units from transactions, tolerant to shapes */
const sumUnitsFromTransactions = (arr) => {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, t) => {
    const direct = toNum(t?.qty ?? t?.quantity ?? t?.units ?? 0, 0);
    const items  = Array.isArray(t?.items) ? t.items : [];
    const itemsQty = items.reduce((x, it) => x + toNum(
      it?.qty ?? it?.quantity ?? it?.units ?? it?.count ?? 0,
      0
    ), 0);
    return s + (itemsQty || direct);
  }, 0);
};

/* build a 2-month (prev + current) local range + label like "Sep + Oct" */
const twoMonthWindow = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0..11
  const prevStartLocal = new Date(y, m - 1, 1);
  const currEndLocal   = new Date(y, m + 1, 0);
  const startISO = localISODate(prevStartLocal);
  const endISO   = localISODate(currEndLocal);

  const prevLabel = prevStartLocal.toLocaleString("en-US", { month: "short" });
  const currLabel = now.toLocaleString("en-US", { month: "short" });
  const label = `${prevLabel} + ${currLabel}`;

  return { startISO, endISO, label };
};

function Revenue() {
  /* ---------- Refs ---------- */
  const revenueRef = useRef(null);
  const productRef = useRef(null);
  const chartsRef  = useRef({});

  /* ---------- Toast helper ---------- */
  const notify = (msg, type = "info") => {
    document.querySelectorAll(".notification").forEach((n) => n.remove());
    const colors = { success:"#10B981", error:"#EF4444", warning:"#F59E0B", info:"#3B82F6" };
    const icons  = { success:"fa-check-circle", error:"fa-exclamation-circle", warning:"fa-exclamation-triangle", info:"fa-info-circle" };
    const n = document.createElement("div");
    n.className = "notification";
    n.style.cssText = `
      position:fixed; top:20px; right:20px; background:#fff; color:${colors[type]};
      padding:15px 20px; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.15);
      border-left:4px solid ${colors[type]}; z-index:10000; display:flex; align-items:center; gap:10px;
      max-width:420px; animation:slideIn .3s ease; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;
    n.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to{ transform:translateX(0); opacity:1; } }
        @keyframes slideOut { from { transform:translateX(0); opacity:1; } to{ transform:translateX(100%); opacity:0; } }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = "slideOut .3s ease"; setTimeout(() => n.remove(), 300); }, 3000);
  };

  /* ---------- KPI state ---------- */
  const [revKpi, setRevKpi]       = useState({ revenue: 0 });
  const [ordersKpi, setOrdersKpi] = useState({ units: 0 });
  const [ordersSubtitle, setOrdersSubtitle] = useState("Units Sold"); // dynamic (Sep + Oct)
  const [marginPct, setMarginPct] = useState(0);
  const [netProfit, setNetProfit] = useState(0);

  const [revLoading, setRevLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(true);

  /* ---------- Inventory (not shown in UI here, but kept) ---------- */
  const [inv, setInv] = useState({
    inventoryValue: 0,
    productValue: 0,
    combinedValue: 0,
    inventoryQty: 0,
    productQty: 0,
    inventoryItems: 0,
    productItems: 0,
  });

  /* ---------- Table + Chart source ---------- */
  const [txRows, setTxRows] = useState([]);       // recent transactions list
  const [revLine, setRevLine] = useState([]);     // 12 numbers for months
  const [catBars, setCatBars] = useState([]);     // [{label, value}] top-6

  /* ---------- Modal state for "View" ---------- */
  const [selectedTx, setSelectedTx] = useState(null);

  /* ---------- chart options ---------- */
  const baseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { usePointStyle: true, color: "#111827" } } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#e9ebf2" }, ticks: { color: "#6b7280" } },
        x: { grid: { color: "#e9ebf2" }, ticks: { color: "#6b7280" } },
      },
    }),
    []
  );

  /* ---------- Fetch KPIs & tables & charts ---------- */
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      // ---------- Month ranges (local, used elsewhere) ----------
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth(); // 0..11
      const startLocal = new Date(y, m, 1);
      const endLocal   = new Date(y, m + 1, 0);
      const startISO   = localISODate(startLocal);
      const endISO     = localISODate(endLocal);
      const monthQs    = `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;

      // ---------- Revenue KPI (ALL-TIME: sum of all transactions, refunds excluded) ----------
      try {
        const { data: summary } = await api.get("/transactions/summary");
        const allRevenue = toNum(summary?.allTime?.revenue, 0);
        if (!cancelled) {
          setRevKpi({ revenue: allRevenue });
          setRevLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setRevKpi({ revenue: 0 });
          setRevLoading(false);
        }
      }

      // ---------- Orders KPI (UNITS) for prev + current month ----------
      try {
        const { startISO: unitsStartISO, endISO: unitsEndISO, label } = twoMonthWindow();
        setOrdersSubtitle(`Units Sold (${label})`);

        let units = 0;
        try {
          const { data } = await api.get(
            `/transactions/summary?start=${encodeURIComponent(unitsStartISO)}&end=${encodeURIComponent(unitsEndISO)}`
          );
          const candidates = [data?.totalQty, data?.totalUnits, data?.units, data?.countQty]
            .map((n) => toNum(n, NaN));
          const picked = candidates.find(Number.isFinite);
          if (Number.isFinite(picked)) units = picked;
        } catch (e) {}

        if (!units) {
          const { data: list } = await api.get(
            `/transactions?start=${encodeURIComponent(unitsStartISO)}&end=${encodeURIComponent(unitsEndISO)}&limit=5000&sort=+date`
          );
          units = sumUnitsFromTransactions(list);
        }

        if (!cancelled) setOrdersKpi({ units });
      } catch (e) {
        if (!cancelled) setOrdersKpi({ units: 0 });
      }

      // ---------- Recent transactions table (top 20) ----------
      let recent = [];
      try {
        const { data } = await api.get("/transactions?limit=200&sort=-date");
        recent = Array.isArray(data) ? data : [];
        if (!cancelled) setTxRows(recent.slice(0, 20));
      } catch (e) {
        if (!cancelled) setTxRows([]);
      }

      // ---------- Monthly revenue for the chart (server-monthly preferred; robust parsing; local fallback) ----------
      try {
        const buildYearLineFromMonthly = (payload) => {
          const yr = new Date().getFullYear();
          const byMonth = Array(12).fill(0);

          const series = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.series)
            ? payload.series
            : Array.isArray(payload?.keys)
            ? payload.keys.map((k) => ({
                y: Number(String(k.key).slice(0, 4)),
                m: Number(String(k.key).slice(5, 7)),
                revenue: Number(k.revenue || 0),
              }))
            : [];

          series.forEach((r) => {
            const yy = Number(r.y ?? r._id?.y ?? (typeof r.key === "string" ? Number(r.key.slice(0, 4)) : NaN));
            const mm = Number(r.m ?? r._id?.m ?? (typeof r.key === "string" ? Number(r.key.slice(5, 7)) : NaN));
            const val = Number(r.revenue ?? r.total ?? r.value ?? 0);
            if (yy === yr && mm >= 1 && mm <= 12) byMonth[mm - 1] += val;
          });

          return byMonth;
        };

        // 1) Prefer your normalized server buckets (last 12 months)
        let monthly = null;
        try {
          const { data } = await api.get(`/transactions/revenue/monthly?months=12`);
          monthly = data; // { series, keys, months }
        } catch (e) {}

        // 2) If nothing yet, try the yearly range
        if (!monthly) {
          const yrNow = new Date().getFullYear();
          const qs = `?start=${encodeURIComponent(`${yrNow}-01-01`)}&end=${encodeURIComponent(`${yrNow}-12-31`)}`;
          try {
            const { data } = await api.get(`/transactions/revenue/monthly${qs}`);
            monthly = data; // { series, keys, start, end }
          } catch (e) {}
        }

        if (monthly) {
          const byMonth = buildYearLineFromMonthly(monthly);
          if (!cancelled) setRevLine(byMonth);
        } else {
          // 3) Fallback: compute locally for current year using LOCAL months (not UTC)
          const yrNow = new Date().getFullYear();
          const startYISO = `${yrNow}-01-01`;
          const endYISO   = `${yrNow}-12-31`;
          const { data: list } = await api.get(
            `/transactions?start=${encodeURIComponent(startYISO)}&end=${encodeURIComponent(endYISO)}&limit=5000&sort=+date`
          );

          const byMonth = Array(12).fill(0);
          const isRefund = (t) => String(t?.status || "").toLowerCase() === "refund";
          const pickDate = (t) => t?.date || t?.createdAt || t?.updatedAt || null;

          (Array.isArray(list) ? list : []).forEach((t) => {
            if (isRefund(t)) return;
            const raw = pickDate(t);
            if (!raw) return;
            const d = new Date(raw);
            const yLocal = d.getFullYear();
            const mLocal = d.getMonth(); // 0..11 (LOCAL)
            if (yLocal !== yrNow) return;
            byMonth[mLocal] += lineTotal(t);
          });

          if (!cancelled) setRevLine(byMonth);
        }
      } catch (e) {
        if (!cancelled) setRevLine(Array(12).fill(0));
      }

      // ---------- Top categories (use the same recent slice) ----------
      try {
        const byProduct = new Map();
        (Array.isArray(recent) ? recent : []).forEach((t) => {
          if (String(t?.status || "").toLowerCase() === "refund") return;
          const key = (t?.productName || "Other").toString();
          const ttl = lineTotal(t);
          byProduct.set(key, (byProduct.get(key) || 0) + ttl);
        });

        const top = [...byProduct.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, value]) => ({ label, value }));

        if (!cancelled) setCatBars(top);
      } catch (e) {
        if (!cancelled) setCatBars([]);
      }

      // ---------- Net Profit (+ Margin) from ALL-TIME numbers ----------
      try {
        const [{ data: summary }, { data: payroll }, { data: contrib }, { data: invSum }] =
          await Promise.all([
            api.get("/transactions/summary"), // v2; read allTime.revenue
            api.get("/salary/summary").catch(() => ({ data: { totalNet: 0 } })),
            api.get("/contributions/summary").catch(() => ({ data: { grandTotal: 0 } })),
            api.get("/inventory/summary").catch(() => ({ data: {} })),
          ]);

        const revenueAll    = toNum(summary?.allTime?.revenue, 0);
        const payrollTotal  = toNum(payroll?.totalNet, 0);
        const contribTotal  = toNum(contrib?.grandTotal, 0);
        const inventoryOnly = toNum(invSum?.inventory?.totalValue, 0);
        const totalExpenses = payrollTotal + contribTotal + inventoryOnly;
        const net           = revenueAll - totalExpenses;
        const pct           = revenueAll > 0 ? (net / revenueAll) * 100 : 0;

        if (!cancelled) {
          setNetProfit(net);
          setMarginPct(pct);
        }
      } catch (e) {
        if (!cancelled) {
          setNetProfit(0);
          setMarginPct(0);
        }
      }

      // ---------- Inventory (unchanged) ----------
      try {
        const { data } = await api.get("/inventory/summary");
        if (!cancelled) {
          const invObj = data?.inventory || {};
          const prodObj = data?.products || {};
          const inventoryValue = Number(invObj.totalValue || 0);
          const productValue   = Number(prodObj.totalValue || 0);
          const combinedValue  = inventoryValue + productValue;

          setInv({
            inventoryValue,
            productValue,
            combinedValue,
            inventoryQty: invObj.totalQty || 0,
            productQty: prodObj.totalQty || 0,
            inventoryItems: invObj.itemCount || 0,
            productItems: prodObj.itemCount || 0,
          });
          setInvLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          notify(e?.response?.data?.message || "Failed to load inventory", "error");
          setInvLoading(false);
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  /* ---------- Init/Update Charts (with September hard-coded) ---------- */
  useEffect(() => {
    Object.values(chartsRef.current).forEach((c) => c?.destroy());
    chartsRef.current = {};

    // Hardcode September (index 8) to 826,860 for display in the chart
    const patchedRevLine = Array.isArray(revLine) ? [...revLine] : Array(12).fill(0);
    const SEP_INDEX = 8; // Jan=0 ... Sep=8
    patchedRevLine[SEP_INDEX] = 826860;

    if (revenueRef.current) {
      chartsRef.current.revenue = new Chart(revenueRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: MONTHS,
          datasets: [
            {
              label: `${new Date().getFullYear()} Revenue (LKR)`,
              data: patchedRevLine, // use patched data here
              borderColor: "#6d28d9",
              backgroundColor: "rgba(125, 86, 250, .10)",
              borderWidth: 3,
              fill: true,
              tension: 0.35,
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#e9ebf2" },
              ticks: {
                color: "#6b7280",
                callback: (v) => "LKR " + Math.round(v / 1000).toLocaleString("en-LK") + "K",
              },
            },
            x: { grid: { color: "#e9ebf2" }, ticks: { color: "#6b7280" } },
          },
          plugins: {
            legend: { labels: { usePointStyle: true, color: "#111827" } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${fmtLKR(ctx.parsed.y)}`
              }
            }
          }
        },
      });
    }

    if (productRef.current) {
      chartsRef.current.product = new Chart(productRef.current.getContext("2d"), {
        type: "bar",
        data: {
          labels: catBars.map((x) => x.label),
          datasets: [{
            label: "Sales (LKR 000s)",
            data: catBars.map((x) => Math.round(x.value / 1000)),
            backgroundColor: ["#e91e63","#6d28d9","#10b981","#8b5cf6","#f59e0b","#06b6d4"],
            borderRadius: 10,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#e9ebf2" },
              ticks: {
                color: "#6b7280",
                callback: (v) => "LKR " + Number(v).toLocaleString("en-LK") + "K",
              },
            },
            x: { grid: { color: "#e9ebf2" }, ticks: { color: "#6b7280" } },
          },
          plugins: {
            legend: { labels: { usePointStyle: true, color: "#111827" } },
            tooltip: {
              callbacks: {
                label: (ctx) => `LKR ${Number(ctx.parsed.y).toLocaleString("en-LK")}K`,
              }
            }
          }
        },
      });
    }

    return () => {
      Object.values(chartsRef.current).forEach((c) => c?.destroy());
      chartsRef.current = {};
    };
  }, [revLine, catBars]);

  /* ---------- Printable helpers ---------- */
  const buildDocStyles = () => `
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color:#111827; }
      .wrap { max-width: 900px; margin: 24px auto; padding: 24px; }
      .head { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e5e7eb; padding-bottom:12px; }
      .brand { display:flex; align-items:center; gap:12px; }
      .logo { width:48px; height:48px; object-fit:contain; border-radius:8px; }
      h1 { margin:0; font-size: 22px; }
      .muted { color:#6b7280; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top:16px; }
      .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
      table { width:100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom:1px solid #e5e7eb; text-align:left; padding:10px 8px; }
      th { background:#f9fafb; }
      .right { text-align:right; }
      .total { font-weight:700; }
      .tag { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#eef2ff; color:#3730a3; }
      .foot { margin-top: 24px; display:flex; justify-content:flex-end; gap: 16px; }
      .btn { padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; }
      .btn.primary { background:#6d28d9; color:#fff; border-color:#6d28d9; }
      @media print {
        .foot { display:none; }
        .card { border:none; }
        .wrap { padding:0; }
        body { margin:0; }
      }
    </style>
  `;

  const openPrintable = (title, html, autoPrint = false) => {
    const win = window.open("", "_blank");
    if (!win) return notify("Popup blocked. Please allow popups.", "warning");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${buildDocStyles()}</head><body>${html}</body></html>`);
    win.document.close();
    if (autoPrint) {
      win.focus();
      win.onload = () => win.print();
    }
  };

  const renderInvoiceHTML = (tx) => {
    const id = (tx?._id || "").toString().slice(-8).toUpperCase();
    const date = tx?.date ? new Date(tx.date) : new Date();
    const qty = toNum(tx?.qty, 0);
    const unit = toNum(tx?.unitPrice, 0);
    const disc = toNum(tx?.discountPerUnit, 0);
    const total = lineTotal(tx);

    return `
      <div class="wrap">
        <div class="head">
          <div class="brand">
            <img src="${INVOICE_LOGO}" alt="Company Logo" class="logo" onerror="this.style.display='none'"/>
            <div>
              <h1>Invoice</h1>
              <div class="muted">Invoice No: INV-${id}</div>
            </div>
          </div>
          <div class="muted">
            <div>Date: ${localISODate(date)}</div>
            <div>Method: ${tx?.method || "—"}</div>
            <div>Status: <span class="tag">${tx?.status || "paid"}</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <strong>From</strong>
            <div>Packpal Ltd.</div>
            <div>123 Main Street</div>
            <div>Colombo</div>
          </div>
          <div class="card">
            <strong>Bill To</strong>
            <div>${tx?.customer || "Valued Customer"}</div>
            <div>${tx?.customerEmail || ""}</div>
            <div>${tx?.customerPhone || ""}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Discount/Unit</th>
              <th class="right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${tx?.productName || "Item"}</td>
              <td class="right">${qty}</td>
              <td class="right">${fmtLKR(unit)}</td>
              <td class="right">${fmtLKR(disc)}</td>
              <td class="right total">${fmtLKR(total)}</td>
            </tr>
          </tbody>
        </table>

        <div class="foot">
          <button class="btn" onclick="window.close()">Close</button>
          <button class="btn primary" onclick="window.print()">Print / Save PDF</button>
        </div>
      </div>
    `;
  };

  const renderSummaryHTML = (tx) => {
    const id = (tx?._id || "").toString().slice(-8).toUpperCase();
    const date = tx?.date ? new Date(tx.date) : new Date();
    const total = lineTotal(tx);
    return `
      <div class="wrap">
        <div class="head">
          <div class="brand">
            <img src="${INVOICE_LOGO}" alt="Company Logo" class="logo" onerror="this.style.display='none'"/>
            <div>
              <h1>Order Summary</h1>
              <div class="muted">Order #${id}</div>
            </div>
          </div>
          <div class="muted">
            <div>${localISODate(date)}</div>
            <div>Status: <span class="tag">${tx?.status || "paid"}</span></div>
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div><strong>Customer:</strong> ${tx?.customer || "—"}</div>
          <div><strong>Channel:</strong> ${tx?.method || "—"}</div>
          <div><strong>Product:</strong> ${tx?.productName || "—"}</div>
          <div><strong>Quantity:</strong> ${toNum(tx?.qty,0)}</div>
          <div><strong>Unit Price:</strong> ${fmtLKR(toNum(tx?.unitPrice,0))}</div>
          <div><strong>Discount/Unit:</strong> ${fmtLKR(toNum(tx?.discountPerUnit,0))}</div>
          <div style="margin-top:10px; font-size:18px;"><strong>Total:</strong> ${fmtLKR(total)}</div>
        </div>

        <div class="foot">
          <button className="btn" onclick="window.close()">Close</button>
          <button className="btn primary" onclick="window.print()">Print / Save PDF</button>
        </div>
      </div>
    `;
  };

  const generateInvoice = (tx) => {
    if (!tx) return notify("No transaction selected", "warning");
    openPrintable(`Invoice INV-${(tx?._id || "").toString().slice(-8).toUpperCase()}`, renderInvoiceHTML(tx), true);
  };

  const exportPDF = (tx) => {
    if (!tx) return notify("No transaction selected", "warning");
    openPrintable(`Order ${ (tx?._id || "").toString().slice(-8).toUpperCase() }`, renderSummaryHTML(tx), true);
  };

  return (
    <div className="rev">
      <Sidebar />
      <main className="rev-container">
        <div className="content-header">
          <h1>Sales & Revenue </h1>
          <p>Clean, professional view of sales performance, trends and targets</p>
        </div>

        {/* KPI Cards */}
        <section className="rev-kpi-grid rev-fade-in">
          <article className="rev-kpi">
            <div className="rev-kpi-head">
              <div className="rev-kpi-icon"><i className="fas fa-building-columns" /></div>
              <div>
                <div className="rev-kpi-title">Revenue</div>
                <div className="rev-kpi-sub">All-time revenue</div>
              </div>
            </div>
            <div className="rev-kpi-value">
              {revLoading ? "…" : fmtLKR(revKpi.revenue)}
            </div>
            <div className="rev-kpi-meta">
              <span>{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
              <span className="rev-kpi-change"><i className="fas fa-arrow-up" /> +0.0%</span>
            </div>
          </article>

          <article className="rev-kpi">
            <div className="rev-kpi-head">
              <div className="rev-kpi-icon"><i className="fas fa-credit-card" /></div>
              <div>
                <div className="rev-kpi-title">Orders</div>
                <div className="rev-kpi-sub">{ordersSubtitle}</div>
              </div>
            </div>
            <div className="rev-kpi-value">{numStr(ordersKpi.units)}</div>
            <div className="rev-kpi-meta">
              <span>{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
              <span className="rev-kpi-change"><i className="fas fa-arrow-up" /> +0.0%</span>
            </div>
          </article>

          <article className="rev-kpi">
            <div className="rev-kpi-head">
              <div className="rev-kpi-icon"><i className="fas fa-percentage" /></div>
              <div>
                <div className="rev-kpi-title">Profit Margin</div>
                <div className="rev-kpi-sub">Net</div>
              </div>
            </div>
            <div className="rev-kpi-value">{toNum(marginPct, 0).toFixed(1)}%</div>
            <div className="rev-kpi-meta">
              <span>{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
              <span className={`rev-kpi-change ${marginPct < 0 ? "rev-neg" : ""}`}>
                <i className={`fas fa-arrow-${marginPct < 0 ? "down" : "up"}`} /> {`${Math.abs(toNum(marginPct, 0)).toFixed(1)}%`}
               
              </span>
            </div>
          </article>
        </section>

        {/* Charts */}
        <section className="rev-charts rev-fade-in">
          <div className="rev-card">
            <h3><i className="fas fa-chart-area" /> Monthly Revenue Trends</h3>
            <div className="rev-canvas-wrap"><canvas ref={revenueRef} /></div>
          </div>
          <div className="rev-card">
            <h3><i className="fas fa-chart-bar" /> Sales by Category</h3>
            <div className="rev-canvas-wrap"><canvas ref={productRef} /></div>
          </div>
        </section>

        {/* Transactions */}
        <section className="rev-table-section rev-fade-in">
          <div className="rev-section-head">
            <h3><i className="fas fa-table" /> Recent Transactions</h3>
          </div>
          <div className="rev-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txRows.map((t) => {
                  const id = t?._id || "—";
                  const customer = t?.customer || "—";
                  const date = t?.date ? localISODate(new Date(t.date)) : "—";
                  const value = fmtLKR(lineTotal(t));
                  const channel = t?.method || "—";
                  const status = (t?.status || "paid").toLowerCase();
                  const statusClass =
                    status === "refund" ? "rev-pend" :
                    status === "paid"   ? "rev-ok"   :
                    status === "packing"? "rev-proc" : "rev-ok";

                  return (
                    <tr key={id}>
                      <td>#{id.toString().slice(-8).toUpperCase()}</td>
                      <td>{customer}</td>
                      <td>{date}</td>
                      <td>{value}</td>
                      <td>{channel}</td>
                      <td><span className={`rev-status ${statusClass}`}>{t?.status || "paid"}</span></td>
                      <td>
                        <button
                          className="rev-btn rev-btn-primary rev-btn-sm"
                          onClick={() => setSelectedTx(t)}
                        >
                          View
                        </button>{" "}
                        <button
                          className="rev-btn rev-btn-success rev-btn-sm"
                          onClick={() => generateInvoice(t)}
                        >
                          Invoice
                        </button>{" "}
                        <button
                          className="rev-btn rev-btn-warning rev-btn-sm"
                          onClick={() => exportPDF(t)}
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!txRows.length && (
                  <tr><td colSpan={7} style={{ textAlign:"center", padding:"16px" }}>No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* View Modal */}
        {selectedTx && (
          <div
            className="rev-modal-backdrop"
            onClick={() => setSelectedTx(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 10000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16
            }}
          >
            <div
              className="rev-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 16, width: "min(760px, 96vw)",
                boxShadow: "0 20px 60px rgba(255, 255, 255, 0.2)", padding: 20
              }}
            >
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8}}>
                <h3 style={{margin:0}}>Order #{(selectedTx?._id || "").toString().slice(-8).toUpperCase()}</h3>
                <button className="rev-btn rev-btn-sm" onClick={() => setSelectedTx(null)}>Close</button>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12}}>
                <div>
                  <div><strong>Customer:</strong> {selectedTx.customer || "—"}</div>
                  <div><strong>Date:</strong> {selectedTx.date ? localISODate(new Date(selectedTx.date)) : "—"}</div>
                  <div><strong>Status:</strong> {selectedTx.status || "paid"}</div>
                  <div><strong>Channel:</strong> {selectedTx.method || "—"}</div>
                </div>
                <div>
                  <div><strong>Product:</strong> {selectedTx.productName || "—"}</div>
                  <div><strong>Qty:</strong> {toNum(selectedTx.qty, 0)}</div>
                  <div><strong>Unit Price:</strong> {fmtLKR(toNum(selectedTx.unitPrice, 0))}</div>
                  <div><strong>Discount/Unit:</strong> {fmtLKR(toNum(selectedTx.discountPerUnit, 0))}</div>
                </div>
              </div>
              <div style={{marginTop:12, fontSize:18}}>
                <strong>Total:</strong> {fmtLKR(lineTotal(selectedTx))}
              </div>
              <div style={{marginTop:16}}>
                <button className="rev-btn rev-btn-success rev-btn-sm" onClick={() => generateInvoice(selectedTx)}>
                  Generate Invoice
                </button>{" "}
                <button className="rev-btn rev-btn-warning rev-btn-sm" onClick={() => exportPDF(selectedTx)}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Revenue;
