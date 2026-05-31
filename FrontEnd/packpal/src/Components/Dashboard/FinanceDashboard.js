// src/Components/FinanceDashboard/FinanceDashboard.jsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import Chart from "chart.js/auto";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./FinanceDashboard.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { api } from "../../lib/api";

/* ===== helpers ===== */
const fmtLKRNum = (n) => Math.round(Number(n || 0)).toLocaleString("en-LK");
const fmtLKR = (n) => `LKR ${fmtLKRNum(n)}`;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp0 = (v) => Math.max(0, num(v));

const showNotification = (message, type = "info") => {
  document.querySelectorAll(".notification").forEach((n) => n.remove());
  const colors = { success: "#10B981", error: "#EF4444", warning: "#F59E0B", info: "#3B82F6" };
  const icons  = { success:"fa-check-circle", error:"fa-exclamation-circle", warning:"fa-exclamation-triangle", info:"fa-info-circle" };
  const n = document.createElement("div");
  n.className = "notification";
  n.style.cssText = `
    position:fixed; top:16px; right:16px; background:#fff; color:${colors[type]};
    padding:12px 16px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.12);
    border-left:4px solid ${colors[type]}; z-index:10000; display:flex; align-items:center; gap:10px;
    max-width:420px; animation:fd-slideIn .25s ease; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  `;
  n.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  if (!document.querySelector("#fd-toast-anim")) {
    const style = document.createElement("style"); style.id = "fd-toast-anim";
    style.textContent = `
      @keyframes fd-slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes fd-slideOut { from { transform:translateX(0); opacity:1; } to { transform:translateX(100%); opacity:0; } }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(n);
  setTimeout(() => { n.style.animation = "fd-slideOut .25s ease"; setTimeout(() => n.remove(), 250); }, 2600);
};

/* month utils */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CHART_MONTHS = 4;
const lastNMonthsLabels = (n = CHART_MONTHS) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return MONTHS[d.getMonth()];
  });
};
const stepUpSeries = (finalValue = 0, n = CHART_MONTHS) =>
  Array.from({ length: n }, (_, i) => (i === n - 1 ? Number(finalValue || 0) : 0));

/* === alignment helpers === */
const buildMonthsWindow = (n = CHART_MONTHS) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: MONTHS[d.getMonth()] });
  }
  return out;
};
const alignSeriesToWindow = (monthly = [], window = [], getVal = () => 0) => {
  const idx = new Map();
  for (const it of monthly) {
    const y = Number(it?.y ?? it?._id?.y);
    const m = Number(it?.m ?? it?._id?.m);
    if (Number.isFinite(y) && Number.isFinite(m)) idx.set(`${y}-${m}`, it);
  }
  return window.map(({ y, m }) => {
    const hit = idx.get(`${y}-${m}`);
    const val = getVal(hit);
    return Number.isFinite(Number(val)) ? Number(val) : 0;
  });
};
const sum3 = (a = 0, b = 0, c = 0) => Number(a || 0) + Number(b || 0) + Number(c || 0);

/* discount helpers */
const isPercentType = (t) => {
  const s = String(t || "").trim().toLowerCase();
  return s === "percentage" || s === "percent" || s === "%" || s === "pct" || s === "pc";
};
const discountedUnit = ({ price, discountType, discountValue }) => {
  const p = clamp0(price);
  const v = num(discountValue, 0);
  if (v <= 0) return p;
  if (isPercentType(discountType)) {
    const pct = Math.max(0, Math.min(100, v));
    return clamp0(p * (1 - pct / 100));
  }
  return clamp0(p - v);
};

export default function FinanceDashboard() {
  const revenueRef = useRef(null);
  const expenseRef = useRef(null);
  const cashFlowRef = useRef(null);

  const [inv, setInv] = useState({
    inventoryValue: 0, inventoryQty: 0, inventoryItems: 0,
    productValue: 0, productQty: 0, productItems: 0,
    combinedValue: 0, productDiscount: 0,
  });
  const [invLoading, setInvLoading] = useState(true);

  const [rev, setRev] = useState({ revenue: 0, count: 0, monthly: [] });
  const [revLoading, setRevLoading] = useState(true);

  const [exp, setExp] = useState({
    total: 0, payroll: 0, contrib: 0, inventory: 0, monthly: [], loading: true,
  });

  const netProfit = useMemo(() => {
    if (revLoading || exp.loading) return null;
    return num(rev.revenue) - num(exp.total);
  }, [rev, revLoading, exp]);

  useEffect(() => {
    // INVENTORY + PRODUCTS (KPI only; not monthly)
    (async () => {
      try {
        const invP = api.get("/inventory/summary").catch(() => ({ data: {} }));
        const prodListP = api.get("/products").catch(() => api.get("/api/products"));
        const [{ data: invSum }, prodListRes] = await Promise.all([invP, prodListP]);

        const productsRaw = prodListRes?.data ?? [];
        const products = Array.isArray(productsRaw)
          ? productsRaw
          : productsRaw?.items ?? productsRaw?.data ?? [];

        const invObj = invSum?.inventory ?? invSum ?? {};
        const inventoryValue = num(invObj?.totalValue, 0);
        const inventoryQty   = num(invObj?.totalQty, 0);
        const inventoryItems = num(invObj?.itemCount, 0);

        let productValue = 0, productQty = 0, productItems = 0, productDiscountTotal = 0;
        for (const r of products) {
          const price = num(r.price ?? r.unitPrice, 0);
          const stock = num(r.stock ?? r.quantity, 0);
          const type  = r.discountType;
          const dval  = num(r.discountValue, 0);
          const unitAfter = discountedUnit({ price, discountType: type, discountValue: dval });
          productValue += unitAfter * stock;
          productQty   += stock;
          productItems += 1;
          if (dval > 0) {
            const perUnitDisc = isPercentType(type) ? price * (dval / 100) : dval;
            productDiscountTotal += Math.min(price, perUnitDisc) * stock;
          }
        }

        const combinedValue = clamp0(inventoryValue + productValue);
        setInv({
          inventoryValue, inventoryQty, inventoryItems,
          productValue, productQty, productItems,
          combinedValue, productDiscount: productDiscountTotal,
        });
      } catch (e) {
        showNotification(e?.response?.data?.message || "Failed to load inventory & products", "error");
      } finally {
        setInvLoading(false);
      }
    })();

    // ===== TOTAL REVENUE — CURRENT MONTH ONLY (e.g., October) =====
    (async () => {
      try {
        // Build current month [YYYY-MM-01 .. YYYY-MM-lastDay]
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth(); // 0..11
        const start = new Date(y, m, 1);
        const end   = new Date(y, m + 1, 0);
        const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const startISO = iso(start);
        const endISO   = iso(end);
        const qs = `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;

        let revenue = 0;
        let count = 0;

        // 1) Preferred: summary for the month
        try {
          const { data } = await api.get(`/transactions/summary${qs}`);
          if (data) {
            revenue = num(data.revenue, 0);
            count   = num(data.count, 0);
          }
        } catch { /* noop */ }

        // 2) Fallback: client-side sum for the month (exclude Refund)
        if (revenue === 0 && count === 0) {
          try {
            const { data: list } = await api.get(`/transactions${qs}&limit=5000&sort=+createdAt`);
            const arr = Array.isArray(list) ? list : [];
            for (const t of arr) {
              if (String(t?.status || "").toLowerCase() === "refund") continue;
              revenue += num(t?.total, 0);
            }
            count = arr.filter(t => String(t?.status || "").toLowerCase() !== "refund").length;
          } catch { /* noop */ }
        }

        setRev((s) => ({ ...s, revenue, count }));
      } catch (e) {
        showNotification(e?.response?.data?.message || "Failed to load revenue", "error");
      } finally {
        setRevLoading(false);
      }
    })();

    // EXPENSES (KPI fallback from v1; DO NOT set monthly here)
    (async () => {
      try {
        const payrollP = api.get("/salary/summary").catch(() => ({ data: { totalNet: 0 } }));
        const contribP = api.get("/salary/contributions/summary-v2").catch(() => ({ data: { currentMonth:{value:0} } }));
        const invP     = api.get("/inventory/summary").catch(() => ({ data: {} }));

        const [{ data: payroll }, { data: contrib }, { data: invSum }] =
          await Promise.all([payrollP, contribP, invP]);

        const payrollTotal = num(payroll?.totalNet, 0);
        const contribTotal = num(contrib?.currentMonth?.value ?? 0, 0);
        const inventoryOnly = num(invSum?.inventory?.totalValue, 0);

        setExp((s) => ({
          ...s,
          total: payrollTotal + contribTotal + inventoryOnly,
          payroll: payrollTotal,
          contrib: contribTotal,
          inventory: inventoryOnly,
          loading: false,
        }));
      } catch {
        showNotification("Failed to load expenses", "error");
        setExp((s) => ({ ...s, loading: false }));
      }
    })();
  }, []);

  /* ===== Load monthly series for charts only (ensure last 4 months incl. Sep) ===== */
  useEffect(() => {
    (async () => {
      // Try dedicated monthly endpoint first
      try {
        const res = await api.get("/transactions/revenue/monthly?months=4");
        const series = res?.data?.series;
        if (Array.isArray(series) && series.length) {
          // Expecting items like { y, m, month, revenue }
          setRev((s) => ({ ...s, monthly: series }));
          return; // done
        }
      } catch { /* fall through to client-side bucketing */ }

      // Fallback: compute from raw transactions over the last 4 months
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS - 1), 1);
        const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const startISO = iso(from);
        const endISO   = iso(to);
        const { data: list } = await api.get(`/transactions?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&limit=5000&sort=+createdAt`);
        const arr = Array.isArray(list) ? list : [];

        // bucket by local year+month; exclude refunds
        const buckets = new Map(); // key "y-m" -> {y,m,month,revenue}
        const put = (y,m,val) => {
          const key = `${y}-${m}`;
          const monthName = MONTHS[m - 1];
          const row = buckets.get(key) || { y, m, month: monthName, revenue: 0 };
          row.revenue += Number(val || 0);
          buckets.set(key, row);
        };

        for (const t of arr) {
          if (String(t?.status || "").toLowerCase() === "refund") continue;
          const d = t?.createdAt ? new Date(t.createdAt) : (t?.date ? new Date(t.date) : null);
          if (!d || Number.isNaN(+d)) continue;
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          put(y, m, Number(t?.total || 0));
        }

        // Build complete last-4-month window and fill missing with 0
        const window4 = buildMonthsWindow(CHART_MONTHS);
        const filled = window4.map(({ y, m, label }) => {
          const hit = buckets.get(`${y}-${m}`);
          return hit ? hit : { y, m, month: label, revenue: 0 };
        });

        setRev((s) => ({ ...s, monthly: filled }));
      } catch {
        // If even this fails, leave monthly empty (chart will step up)
      }
    })();

    (async () => {
      try {
        const [payV2, contrV2, invV2] = await Promise.all([
          api.get("/salary/summary-v2").catch(() => null),                    // [{y,m,month,value}]
          api.get("/salary/contributions/summary-v2").catch(() => null),     // [{y,m,month,value}]
          api.get("/inventory/summary-v2").catch(() => null),                // [{y,m,month,inventory}]
        ]);

        const payrollThis = num(payV2?.data?.currentMonth?.value, 0);
        const contribThis = num(contrV2?.data?.currentMonth?.value, 0);
        const inventoryThis = num(invV2?.data?.currentMonth?.inventory, 0);

        const pArr = Array.isArray(payV2?.data?.monthly) ? payV2.data.monthly : [];
        const cArr = Array.isArray(contrV2?.data?.monthly) ? contrV2.data.monthly : [];
        const iArr = Array.isArray(invV2?.data?.monthly) ? invV2.data.monthly : [];

        // merge by y-m
        const map = new Map();
        const key = (r) => `${Number(r?.y)}-${Number(r?.m)}`;
        for (const r of pArr) map.set(key(r), { y: r.y, m: r.m, month: r.month, payroll: num(r.value, 0), contrib: 0, inventory: 0 });
        for (const r of cArr) {
          const k = key(r);
          const row = map.get(k) || { y: r.y, m: r.m, month: r.month, payroll: 0, contrib: 0, inventory: 0 };
          row.contrib = num(r.value, 0);
          map.set(k, row);
        }
        for (const r of iArr) {
          const k = key(r);
          const row = map.get(k) || { y: r.y, m: r.m, month: r.month, payroll: 0, contrib: 0, inventory: 0 };
          row.inventory = num(r.inventory, 0);
          map.set(k, row);
        }

        const monthlyCombined = Array.from(map.values()).sort((a,b) => (a.y - b.y) || (a.m - b.m));

        setExp((s) => ({
          ...s,
          total: payrollThis + contribThis + inventoryThis,
          payroll: payrollThis,
          contrib: contribThis,
          inventory: inventoryThis,
          monthly: monthlyCombined, // y,m preserved
          loading: false,
        }));
      } catch {}
    })();
  }, []);

  /* Charts */
  useEffect(() => {
    Chart.defaults.font.family =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.color = "#334155";

    let revenueChart, expenseChart, cashFlowChart;

    // fixed 4-month window; e.g. [Jul, Aug, Sep, Oct] this quarter
    const window4 = buildMonthsWindow(CHART_MONTHS);
    const labels = window4.map(w => w.label);

    // Revenue aligned; fallback is step-up for last month if monthly missing
    let revenueSeries;
    if (Array.isArray(rev?.monthly) && rev.monthly.length) {
      revenueSeries = alignSeriesToWindow(rev.monthly, window4, (it) => (it?.value ?? it?.revenue ?? 0));
    } else {
      revenueSeries = stepUpSeries(rev?.revenue || 0, labels.length);
    }

    // EXPENSES STRICT: if no monthly, force zeros (so Jul/Aug are 0)
    let expensesSeries;
    if (Array.isArray(exp?.monthly) && exp.monthly.length) {
      expensesSeries = alignSeriesToWindow(exp.monthly, window4, (it) => sum3(it?.payroll, it?.contrib, it?.inventory));
    } else {
      expensesSeries = new Array(labels.length).fill(0); // strict zero fallback
    }

    // ===== HARD OVERRIDE: force Jul & Aug expenses to 0 in charts =====
    expensesSeries = expensesSeries.map((v, i) => (["Jul","Aug"].includes(labels[i]) ? 0 : v));

    const destroyAll = () => {
      revenueChart?.destroy();
      expenseChart?.destroy();
      cashFlowChart?.destroy();
    };
    destroyAll();

    const grid = { color: "rgba(148, 163, 184, 0.18)", drawBorder: false };
    const ticks = { padding: 6, callback: (v) => fmtLKRNum(v), maxTicksLimit: 6 };
    const tooltip = {
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtLKR(ctx.parsed.y)}` },
      displayColors: false,
      backgroundColor: "#111827",
      titleColor: "#fff",
      bodyColor: "#fff",
    };
    const legend = { position: "top", labels: { usePointStyle: true, boxWidth: 8, padding: 8 } };

    // 1) Revenue vs Expenses
    if (revenueRef.current) {
      const ctx = revenueRef.current.getContext("2d");
      revenueChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Revenue",  data: revenueSeries,  borderColor: "#2563EB", backgroundColor: "rgba(37,99,235,.10)", borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 2.5 },
            { label: "Expenses", data: expensesSeries, borderColor: "#DC2626", backgroundColor: "rgba(220,38,38,.08)", borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 2.5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, layout: { padding: 6 },
          plugins: { legend, tooltip },
          scales: { x: { grid: { display: false } }, y: { grid, ticks, beginAtZero: true } },
        },
      });
    }

    // 2) Expense Breakdown (current-month KPIs)
    if (expenseRef.current) {
      const ctx = expenseRef.current.getContext("2d");
      expenseChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Payroll", "EPF/ETF", "Inventory"],
          datasets: [{ data: [exp?.payroll || 0, exp?.contrib || 0, exp?.inventory || 0], backgroundColor: ["#7C3AED", "#059669", "#F59E0B"], borderWidth: 0, hoverOffset: 8 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 8 } },
            tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtLKR(c.parsed)}` }, displayColors: false, backgroundColor: "#111827", titleColor: "#fff", bodyColor: "#fff" },
          },
          cutout: "64%",
        },
      });
    }

    // 3) Monthly Cash Flow
    if (cashFlowRef.current) {
      const ctx = cashFlowRef.current.getContext("2d");
      cashFlowChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Cash Inflow",  data: revenueSeries,                             backgroundColor: "#16A34A", borderRadius: 5, order: 1 },
            { label: "Cash Outflow", data: expensesSeries.map((v) => -Number(v || 0)), backgroundColor: "#EF4444", borderRadius: 5, order: 2 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, layout: { padding: 6 }, plugins: { legend, tooltip },
          scales: {
            x: { grid: { display: false } },
            y: { grid, ticks, suggestedMin: Math.min(0, -Math.max(...expensesSeries) * 1.1), suggestedMax: Math.max(...revenueSeries) * 1.1 },
          },
        },
      });
    }

    return () => destroyAll();
  }, [rev, exp]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <div className="finance-page-wrap">
          <div className="content-header">
            <h1>Finance Dashboard</h1>
            <p>Real-time financial insights and analytics</p>
          </div>

          {/* KPI Cards */}
          <section className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Revenue</div>
              <div className="kpi-value">{revLoading ? "…" : fmtLKR(rev.revenue)}</div>
              <div className="kpi-change positive">{revLoading ? "loading…" : `${rev.count} transactions`}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Total Expenses</div>
              <div className="kpi-value">{exp.loading ? "…" : fmtLKR(exp.total)}</div>
              <div className="kpi-change negative">
                {exp.loading
                  ? "loading…"
                  : `Payroll  • EPF/ETF  • Inventory (no products)`}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Net Profit</div>
              <div className="kpi-value">{netProfit === null ? "…" : fmtLKR(netProfit)}</div>
              <div className={`kpi-change ${Number(netProfit) >= 0 ? "positive" : "negative"}`}>
                {netProfit === null ? "calculating…" : Number(netProfit) >= 0 ? "↗ Revenue exceeds expenses" : "↘ Expenses exceed revenue"}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Inventory Value</div>
              <div className="kpi-value">{invLoading ? "…" : fmtLKR(inv.combinedValue)}</div>
              <div className="kpi-change positive">
                {invLoading
                  ? "loading…"
                  : `Inventory  • Products   |  ` +
                    `${(inv.inventoryItems + inv.productItems) || 0} items • ${(inv.inventoryQty + inv.productQty) || 0} units`}
              </div>
              {!invLoading && num(inv.productDiscount) > 0 && (
                <div className="kpi-subtle">
                  {/* extra discount info if needed */}
                </div>
              )}
            </div>
          </section>

          {/* Charts */}
          <section className="top-charts">
            <div className="chart-card">
              <div className="chart-title">📈 Revenue vs Expenses Trend</div>
              <div className="chart-container small">
                <canvas ref={revenueRef} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">🥧 Expense Breakdown</div>
              <div className="chart-container small">
                <canvas ref={expenseRef} />
              </div>
            </div>
          </section>

          <section className="bottom-charts">
            <div className="chart-card-monthly">
              <div className="chart-title">💰 Monthly Cash Flow</div>
              <div className="chart-container small">
                <canvas ref={cashFlowRef} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
