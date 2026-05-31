// src/Components/Report/Report.js
import React, { useEffect, useRef, useState } from "react";
import Sidebarpul from "../Sidebar/Sidebarpul";
import "./Report.css";

import Chart from "chart.js/auto";
import html2pdf from "html2pdf.js";
import axios from "axios";
import { purchases } from "../../lib/purchases";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const PRODUCTS_PATH = "/api/products";
const ITEMS_PATH = "/api/inventory";

/** ======= Branding used only in the PDF & header ======= */
const LOGO_URL = "/new logo.png"; // local/public path or absolute URL
const COMPANY = {
  name: "PackPal (Pvt) Ltd",
  address: "No. 42, Elm Street, Colombo",
  email: "hello@packpal.lk",
};
/** ============================================ */

/* ---------------- Helpers ---------------- */
const money = (n) => "LKR " + Number(n || 0).toLocaleString();
const iso = (d) => new Date(d).toISOString().split("T")[0];

function discountedUnitPrice(p) {
  const base = Number(p.unitPrice || 0);
  const type = String(p.discountType || "").trim().toLowerCase();
  const raw = p.discountValue;
  if (raw === null || raw === undefined) return base;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return base;
  const isPercent = ["percent", "percentage", "%", "pc", "pct"].includes(type);
  if (isPercent) return Math.max(0, base * (1 - Math.max(0, Math.min(100, value)) / 100));
  return Math.max(0, base - value);
}
function statusOf(stock) {
  if (stock === 0) return "out-of-stock";
  if (stock <= 20) return "low-stock";
  return "in-stock";
}
function ymKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthKey(dateString, fallbackDate = new Date()) {
  const d = new Date(dateString || fallbackDate);
  return isNaN(d) ? ymKey(fallbackDate) : ymKey(d);
}
function toUiProduct(item) {
  const stock = Number(item.stock ?? item.quantity ?? 0);
  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
  return {
    sku: String(item.sku || item.code || item.itemCode || item._id || ""),
    name: String(item.name || item.productName || "Unnamed"),
    category: String(item.category || "Uncategorized"),
    stock,
    unitPrice,
    discountType: item.discountType || "",
    discountValue: item.discountValue ?? null,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}
function toUiItem(row) {
  const quantity = Number(row.quantity ?? row.stock ?? 0);
  const unitPrice = Number(row.unitPrice ?? row.price ?? 0);
  return {
    name: String(row.name || row.itemName || "Item"),
    quantity,
    unitPrice,
    value: quantity * unitPrice,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || "",
  };
}
function clampToMonth(d) {
  const x = new Date(d);
  if (isNaN(x)) return new Date();
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function monthsBetween(startStr, endStr) {
  const start = clampToMonth(startStr || new Date());
  const end = clampToMonth(endStr || new Date());
  const arr = [];
  const cur = new Date(start);
  while (cur <= end) {
    arr.push(ymKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return arr;
}
function inRange(dateStr, startStr, endStr) {
  if (!startStr && !endStr) return true;
  const t = new Date(dateStr || new Date()).getTime();
  if (isNaN(t)) return true;
  const s = startStr ? new Date(startStr).getTime() : -Infinity;
  const e = endStr ? new Date(endStr).getTime() : Infinity;
  return t >= s && t <= e;
}
const rafDelay = () => new Promise((r) => requestAnimationFrame(() => r()));

// fetch an image in /public as dataURL for jsPDF headers/footers
async function loadImageAsDataURL(path) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ======================================== */

export default function Report() {
  // UI date controls (unchanged UI)
  const [startDate, setStartDate] = useState("2025-06-01");
  const [endDate, setEndDate] = useState("2025-09-30");

  const invRef = useRef(null);
  const orderTrendRef = useRef(null);
  const valueRef = useRef(null);
  const stockRef = useRef(null);
  const itemPieRef = useRef(null);
  const reportDateRef = useRef(null);
  const mainRef = useRef(null);
  const chartsRef = useRef([]);

  useEffect(() => {
    loadAndRender({ start: startDate, end: endDate });
    updateReportDate();
    return () => {
      chartsRef.current.forEach((c) => c && c.destroy());
      chartsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh data if range becomes valid
  useEffect(() => {
    if (endDate >= startDate) {
      loadAndRender({ start: startDate, end: endDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  function updateReportDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (reportDateRef.current) {
      reportDateRef.current.textContent = `Report generated on ${dateStr} • Last updated: ${dateStr} at ${timeStr}`;
    }
  }
  function cssVar(name) {
    const el = mainRef.current || document.documentElement;
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  /* ------------- Data loading + datasets ------------- */
  async function loadAndRender({ start, end } = {}) {
    try {
      const [prodRes, itemRes, poRes] = await Promise.allSettled([
        axios.get(`${API_BASE}${PRODUCTS_PATH}`),
        axios.get(`${API_BASE}${ITEMS_PATH}`),
        purchases.list(),
      ]);

      const rawProducts =
        prodRes.status === "fulfilled"
          ? Array.isArray(prodRes.value.data)
            ? prodRes.value.data
            : prodRes.value.data.items || prodRes.value.data.data || []
          : [];
      const rawItems =
        itemRes.status === "fulfilled"
          ? Array.isArray(itemRes.value.data)
            ? itemRes.value.data
            : itemRes.value.data.items || itemRes.value.data.data || []
          : [];
      const rawOrders =
        poRes.status === "fulfilled" && Array.isArray(poRes.value?.data?.orders)
          ? poRes.value.data.orders
          : [];

      const products = rawProducts.map(toUiProduct);
      const items = rawItems.map(toUiItem);

      // KPIs
      const totalProductsUnits = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
      const totalItemsUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const totalProductsValue = products.reduce(
        (s, p) => s + (Number(p.stock) || 0) * (Number(discountedUnitPrice(p)) || 0),
        0
      );
      const totalItemsValue = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
      const totalInventoryValue = totalProductsValue + totalItemsValue;
      const lowStockProducts = products.filter((p) => statusOf(p.stock) === "low-stock").length;

      safeText("#kpiTotalProducts", totalProductsUnits.toLocaleString());
      safeText("#kpiTotalItems", totalItemsUnits.toLocaleString());
      safeText("#kpiProductsValue", money(totalProductsValue));
      safeText("#kpiItemsValue", money(totalItemsValue));
      safeText("#kpiInventoryValue", money(totalInventoryValue));
      safeText("#kpiLowStock", String(lowStockProducts));

      // Month range
      const valueMonths = monthsBetween(start, end);

      // Values per month
      const prodValByMonth = new Map(valueMonths.map((m) => [m, 0]));
      const itemValByMonth = new Map(valueMonths.map((m) => [m, 0]));

      function clampMonthKey(dateStr) {
        const s = start ? new Date(start) : null;
        const e = end ? new Date(end) : null;
        const d = new Date(dateStr || (e || s || new Date()));
        if (isNaN(d)) return e ? ymKey(clampToMonth(e)) : s ? ymKey(clampToMonth(s)) : ymKey(new Date());
        if (s && d < s) return ymKey(clampToMonth(s));
        if (e && d > e) return ymKey(clampToMonth(e));
        return ymKey(clampToMonth(d));
      }

      for (const p of products) {
        const price = Number(discountedUnitPrice(p)) || 0;
        const stock = Number(p.stock) || 0;
        const val = stock * price;
        if (val <= 0) continue;
        const stamp = p.updatedAt || p.createdAt || start || end || new Date();
        const mk = clampMonthKey(stamp);
        if (!prodValByMonth.has(mk)) prodValByMonth.set(mk, 0);
        prodValByMonth.set(mk, (prodValByMonth.get(mk) || 0) + val);
      }

      for (const it of items) {
        const qty = Number(it.quantity) || 0;
        const unit = Number(it.unitPrice) || 0;
        const val = qty * unit;
        if (val <= 0) continue;
        const stamp = it.updatedAt || it.createdAt || start || end || new Date();
        const mk = clampMonthKey(stamp);
        if (!itemValByMonth.has(mk)) itemValByMonth.set(mk, 0);
        itemValByMonth.set(mk, (itemValByMonth.get(mk) || 0) + val);
      }

      const valueProducts = valueMonths.map((m) => Number(prodValByMonth.get(m)) || 0);
      const valueItems = valueMonths.map((m) => Number(itemValByMonth.get(m)) || 0);
      const valueCombined = valueMonths.map((_, i) => valueProducts[i] + valueItems[i]);

      // Inventory by Category
      const catMap = new Map();
      products.forEach((p) => {
        const cat = p.category || "Uncategorized";
        if (!catMap.has(cat)) catMap.set(cat, { in: 0, low: 0, out: 0 });
        const s = statusOf(p.stock);
        if (s === "in-stock") catMap.get(cat).in += 1;
        else if (s === "low-stock") catMap.get(cat).low += 1;
        else catMap.get(cat).out += 1;
      });
      const catLabels = Array.from(catMap.keys());
      const catIn = catLabels.map((c) => catMap.get(c).in);
      const catLow = catLabels.map((c) => catMap.get(c).low);
      const catOut = catLabels.map((c) => catMap.get(c).out);

      // PO trends
      const trendMap = new Map(valueMonths.map((m) => [m, { pending: 0, completed: 0, cancelled: 0 }]));
      rawOrders.forEach((o) => {
        const stamp = o.orderDate || o.createdAt || start || new Date();
        if (!inRange(stamp, start, end)) return;
        const mk = monthKey(stamp, clampToMonth(start || new Date()));
        const st = String(o.status || "pending").toLowerCase();
        if (!trendMap.has(mk)) trendMap.set(mk, { pending: 0, completed: 0, cancelled: 0 });
        if (st === "pending") trendMap.get(mk).pending += 1;
        else if (st === "approved" || st === "delivered" || st === "complete" || st === "completed")
          trendMap.get(mk).completed += 1;
        else if (st === "cancelled" || st === "canceled") trendMap.get(mk).cancelled += 1;
      });
      const trendMonths = valueMonths;
      const trendPending = trendMonths.map((m) => trendMap.get(m)?.pending || 0);
      const trendCompleted = trendMonths.map((m) => trendMap.get(m)?.completed || 0);
      const trendCancelled = trendMonths.map((m) => trendMap.get(m)?.cancelled || 0);

      // Stock status distribution
      const totalIn = products.filter((p) => statusOf(p.stock) === "in-stock").length;
      const totalLow = products.filter((p) => statusOf(p.stock) === "low-stock").length;
      const totalOut = products.filter((p) => statusOf(p.stock) === "out-of-stock").length;

      // Item inventory share
      const sortedItems = [...items].sort((a, b) => b.quantity - a.quantity);
      const top = sortedItems.slice(0, 6);
      const otherQty = sortedItems.slice(6).reduce((s, x) => s + x.quantity, 0);
      const itemLabels = top.map((i) => i.name).concat(otherQty > 0 ? ["Other"] : []);
      const itemQuantities = top.map((i) => i.quantity).concat(otherQty > 0 ? [otherQty] : []);

      initializeCharts({
        invByCat: { labels: catLabels, in: catIn, low: catLow, out: catOut },
        orderTrends: { labels: trendMonths, pending: trendPending, completed: trendCompleted, cancelled: trendCancelled },
        monthlyValue: { labels: valueMonths, combined: valueCombined, products: valueProducts, items: valueItems },
        stockPie: { values: [totalIn, totalLow, totalOut] },
        itemsPie: { labels: itemLabels, values: itemQuantities },
      });
    } catch (e) {
      console.error("Report load error:", e);
      initializeCharts({
        invByCat: { labels: [], in: [], low: [], out: [] },
        orderTrends: { labels: [], pending: [], completed: [], cancelled: [] },
        monthlyValue: { labels: [], combined: [], products: [], items: [] },
        stockPie: { values: [0, 0, 0] },
        itemsPie: { labels: [], values: [] },
      });
    }
  }

  function safeText(sel, value) {
    const el = document.querySelector(sel);
    if (el) el.textContent = value;
  }

  /* ---------------- Charts ---------------- */
  function initializeCharts(data) {
    chartsRef.current.forEach((c) => c && c.destroy());
    chartsRef.current = [];

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
    };

    // Inventory by Category (stacked)
    if (invRef.current) {
      const c = new Chart(invRef.current.getContext("2d"), {
        type: "bar",
        data: {
          labels: data.invByCat.labels,
          datasets: [
            { label: "In Stock", data: data.invByCat.in, backgroundColor: cssVar("--green") || "#10B981" },
            { label: "Low Stock", data: data.invByCat.low, backgroundColor: cssVar("--amber") || "#F59E0B" },
            { label: "Out of Stock", data: data.invByCat.out, backgroundColor: cssVar("--red") || "#EF4444" },
          ],
        },
        options: { ...commonOpts, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } },
      });
      chartsRef.current.push(c);
    }

    // Order Trends
    if (orderTrendRef.current) {
      const c = new Chart(orderTrendRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: data.orderTrends.labels,
          datasets: [
            { label: "Pending", data: data.orderTrends.pending, borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,.12)", tension: 0.15, fill: true },
            { label: "Completed", data: data.orderTrends.completed, borderColor: "#10B981", backgroundColor: "rgba(16,185,129,.12)", tension: 0.15, fill: true },
            { label: "Cancelled", data: data.orderTrends.cancelled, borderColor: "#EF4444", backgroundColor: "rgba(239,68,68,.12)", tension: 0.15, fill: true },
          ],
        },
        options: { ...commonOpts, scales: { y: { beginAtZero: true } } },
      });
      chartsRef.current.push(c);
    }

    // Monthly Inventory Value — combined + products + items
    if (valueRef.current) {
      const c = new Chart(valueRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: data.monthlyValue.labels,
          datasets: [
            { label: "Inventory Value (LKR)", data: data.monthlyValue.combined, borderColor: "#6366F1", backgroundColor: "rgba(99,102,241,.20)", fill: true, tension: 0.18, borderWidth: 2, order: 1 },
            { label: "Products Value (LKR)", data: data.monthlyValue.products, borderColor: "#10B981", backgroundColor: "transparent", fill: false, tension: 0.18, borderWidth: 3, order: 2 },
            { label: "Items Value (LKR)", data: data.monthlyValue.items, borderColor: "#F59E0B", backgroundColor: "transparent", fill: false, tension: 0.18, borderWidth: 3, order: 3 },
          ],
        },
        options: {
          ...commonOpts,
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => "LKR " + Number(v).toLocaleString() } } },
          plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: LKR ${Number(ctx.parsed.y).toLocaleString()}` } }, legend: { position: "top" } },
        },
      });
      chartsRef.current.push(c);
    }

    // Stock Status
    if (stockRef.current) {
      const c = new Chart(stockRef.current.getContext("2d"), {
        type: "pie",
        data: {
          labels: ["In Stock", "Low Stock", "Out of Stock"],
          datasets: [{ data: data.stockPie.values, backgroundColor: ["#10B981", "#F59E0B", "#EF4444"], borderWidth: 0 }],
        },
        options: { ...commonOpts },
      });
      chartsRef.current.push(c);
    }

    // Item Inventory Pie
    if (itemPieRef.current) {
      const totalQty = (data.itemsPie.values || []).reduce((a, b) => a + b, 0) || 1;
      const c = new Chart(itemPieRef.current.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: data.itemsPie.labels,
          datasets: [{ data: data.itemsPie.values, backgroundColor: ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#22C55E"], borderWidth: 0 }],
        },
        options: { ...commonOpts, cutout: "55%", plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toLocaleString()} (${((ctx.parsed / totalQty) * 100).toFixed(1)}%)` } } } },
      });
      chartsRef.current.push(c);
    }
  }

  /* ---------------- PDF generator (custom look; UI unchanged) ---------------- */
  async function generateReport() {
    if (endDate < startDate) {
      alert("End date cannot be before the start date.");
      return;
    }

    // refresh canvases
    await loadAndRender({ start: startDate, end: endDate });
    await rafDelay();

    const pdfRoot = document.createElement("div");
    pdfRoot.id = "pdfRoot";

    // copy theme CSS vars so colors match
    ["--ink","--text","--muted","--bg","--card","--line","--brand","--brand-600","--green","--amber","--red","--violet","--indigo"]
      .forEach(v => pdfRoot.style.setProperty(v, cssVar(v)));

    // PDF-only CSS (boxed KPIs + layout)
    const style = document.createElement("style");
    style.textContent = `
      .pdf-head { padding:12px 16px 4px 16px; }
      .pdf-rule { height:10px; border-bottom:1px solid #e5e7eb; margin:8px 0 4px; }
      .pdf-small { font-size:11px; color:#6b7280; }
      .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:10px 16px 4px 16px; }
      .kpi-box { border:2px solid rgba(37,99,235,.9); border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; min-height:78px; }
      .kpi-box .v { font-size:20px; font-weight:800; color:#2563eb; line-height:1; }
      .kpi-box .l { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#6b7280; margin-top:6px; }
      .kpi-box.low { border-color:#EF4444; }
      .kpi-box.low .v { color:#EF4444; }
      .fig { margin:8px 16px; }
      .fig h4 { font-size:12px; font-weight:700; color:#111827; margin:4px 0 8px; }
      .card-block { border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; }
      .chart-img { width:100%; height:auto; display:block; }
      @media (max-width:680px){ .kpi-grid { grid-template-columns:1fr; } }
    `;
    pdfRoot.appendChild(style);

    // ======= Header =======
    const now = new Date();
    const head = document.createElement("section");
    head.className = "pdf-head";
    head.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${LOGO_URL}" alt="logo" style="width:36px;height:36px;object-fit:contain;border-radius:6px;border:1px solid #e5e7eb;background:#fff;" />
          <div>
            <div style="font-size:18px;font-weight:700;color:#111827;">Inventory Management Report</div>
            <div class="pdf-small">Generated on ${now.toLocaleDateString()}, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px;font-weight:700;color:#111827;">${COMPANY.name}</div>
          <div class="pdf-small" style="color:#374151;">${COMPANY.address}</div>
          <div class="pdf-small" style="color:#2563eb;">${COMPANY.email}</div>
        </div>
      </div>
      <div class="pdf-rule"></div>
      <div class="pdf-small" style="color:#374151;">Period: ${startDate || "—"} to ${endDate || "—"}</div>
    `;
    pdfRoot.appendChild(head);

    // ======= KPI grid for PDF =======
    const kpiGrid = document.createElement("section");
    kpiGrid.className = "kpi-grid";
    const kpis = [
      { id: "#kpiTotalProducts", label: "Total Products" },
      { id: "#kpiTotalItems", label: "Total Items" },
      { id: "#kpiProductsValue", label: "Total Products Value" },
      { id: "#kpiItemsValue", label: "Total Items Value" },
      { id: "#kpiInventoryValue", label: "Total Inventory Value" },
      { id: "#kpiLowStock", label: "Low Stock Items", low: true },
    ];
    kpis.forEach((k) => {
      const val = (document.querySelector(k.id)?.textContent || "").trim();
      const box = document.createElement("div");
      box.className = `kpi-box${k.low ? " low" : ""}`;
      box.innerHTML = `
        <div>
          <div class="v">${val || "—"}</div>
          <div class="l">${k.label}</div>
        </div>
        <div style="font-size:14px;color:${k.low ? "#EF4444" : "#2563eb"}">
          ${k.low ? "&#9888;" : "&#128181;"}
        </div>
      `;
      kpiGrid.appendChild(box);
    });
    pdfRoot.appendChild(kpiGrid);

    // ======= Figures (each report-part; canvases -> images) =======
    // Skip on-screen KPI grid so it doesn't duplicate in PDF
    const allParts = Array.from((mainRef.current || document).querySelectorAll(".report-part"));
    const parts = allParts.filter((p) => !p.querySelector(".metric-card"));

    const escapeHtml = (s = "") =>
      s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

    let fig = 1;
    for (const part of parts) {
      const clone = part.cloneNode(true);

      // Convert canvases to images
      const srcCanvases = part.querySelectorAll("canvas");
      const dstCanvases = clone.querySelectorAll("canvas");
      srcCanvases.forEach((canvas, i) => {
        const img = document.createElement("img");
        try { img.src = canvas.toDataURL("image/png"); } catch {}
        img.className = "chart-img";
        if (dstCanvases[i]) dstCanvases[i].replaceWith(img);
      });

      const titles = Array.from(part.querySelectorAll(".card-title")).map((n) => n.textContent.trim());
      const figureTitle = titles.length ? titles.join(" · ") : `Section ${fig}`;

      const section = document.createElement("section");
      section.className = "fig";
      section.style.pageBreakInside = "avoid";
      section.innerHTML = `
        <h4>${escapeHtml(`Figure ${fig} — ${figureTitle}`)}</h4>
        <div class="card-block">${clone.innerHTML}</div>
      `;
      pdfRoot.appendChild(section);
      fig += 1;
    }

    // ======= Build + save the PDF =======
    const opt = {
      margin: [8, 8, 10, 8],
      filename: `inventory-report-${iso(new Date())}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      pagebreak: { mode: ["css"], avoid: [".avoid-break"] },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    document.body.appendChild(pdfRoot);

    try {
      await html2pdf()
        .set(opt)
        .from(pdfRoot)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          const total = pdf.internal.getNumberOfPages();
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          for (let i = 1; i <= total; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(120);
            pdf.setDrawColor(220);
            pdf.line(8, 8, pageW - 8, 8);
            const label = `Page ${i} of ${total}`;
            pdf.text(`${COMPANY.name}`, 8, pageH - 6);
            pdf.text(label, pageW - 8 - pdf.getTextWidth(label), pageH - 6);
          }
        })
        .save(); // auto-download
    } finally {
      pdfRoot.remove();
    }
  }

  /* ---------------- Render (UI unchanged) ---------------- */
  const rangeInvalid = endDate < startDate;

  return (
    <div className="rep">
      <Sidebarpul />
      <main className="report-main" ref={mainRef}>
        {/* Header */}
        <div className="header">
          <div className="container">
            <div className="header-content">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={LOGO_URL} alt="logo" style={{ height: 28 }} />
                <div>
                  <div className="header-title">
                    <i className="fas fa-chart-line" />
                    Reports & Analytics
                  </div>
                  <p className="header-subtitle">{COMPANY.name}</p>
                </div>
              </div>
              <button
                onClick={generateReport}
                className="btn-primary"
                disabled={rangeInvalid}
                title={rangeInvalid ? "End date cannot be before start date" : "Generate Report"}
              >
                <i className="fas fa-download" /> Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="container page-body">
          <div className="grid md-grid-4 card mb-20">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                max={endDate}
                className="form-input"
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  if (endDate < next) setEndDate(next);
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                min={startDate}
                className="form-input"
                onChange={(e) => {
                  const next = e.target.value;
                  setEndDate(next);
                  if (next < startDate) setStartDate(next);
                }}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid md-grid-4 report-part">
            <div className="metric-card">
              <div>
                <div className="metric-label">Total Products</div>
                <div className="metric-value" id="kpiTotalProducts">0</div>
              </div>
              <i className="fas fa-box metric-icon brand" />
            </div>
            <div className="metric-card">
              <div>
                <div className="metric-label">Total Items</div>
                <div className="metric-value" id="kpiTotalItems">0</div>
              </div>
              <i className="fas fa-chart-bar metric-icon green" />
            </div>
            <div className="metric-card">
              <div>
                <div className="metric-label">Total Products Value</div>
                <div className="metric-value" id="kpiProductsValue">LKR 0</div>
              </div>
              <i className="fas fa-wallet metric-icon violet" />
            </div>
            <div className="metric-card">
              <div>
                <div className="metric-label">Total Items Value</div>
                <div className="metric-value" id="kpiItemsValue">LKR 0</div>
              </div>
              <i className="fas fa-wallet metric-icon indigo" />
            </div>
            <div className="metric-card">
              <div>
                <div className="metric-label">Total Inventory Value</div>
                <div className="metric-value" id="kpiInventoryValue">LKR 0</div>
              </div>
              <i className="fas fa-wallet metric-icon violet" />
            </div>
            <div className="metric-card">
              <div>
                <div className="metric-label">Low Stock Items</div>
                <div className="metric-value" id="kpiLowStock">0</div>
              </div>
              <i className="fas fa-triangle-exclamation metric-icon red" />
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg-grid-2 report-part mt-20">
            <div className="card">
              <div className="card-title">Inventory by Category</div>
              <div className="chart-container">
                <canvas ref={invRef} id="inventoryChart" />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Purchase Order Trends</div>
              <div className="chart-container">
                <canvas ref={orderTrendRef} id="orderTrendChart" />
              </div>
            </div>
          </div>

          <div className="grid lg-grid-2 report-part">
            <div className="card">
              <div className="card-title">Monthly Inventory Value</div>
              <div className="chart-container">
                <canvas ref={valueRef} id="valueChart" />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Stock Status Distribution</div>
              <div className="chart-container">
                <canvas ref={stockRef} id="stockStatusChart" />
              </div>
            </div>
          </div>

          <div className="report-part mt-20">
            <div className="card">
              <div className="card-title">Item Inventory Share (by Quantity)</div>
              <div className="chart-container">
                <canvas ref={itemPieRef} id="itemInventoryPie" />
              </div>
              <p className="muted">Share of total quantity by individual item.</p>
            </div>
          </div>

          {/* Footer (UI only) */}
          <div className="card gradient-dark mt-20">
            <div className="footer-grid">
              <div className="footer-stat">
                <div className="footer-value blue">LKR 250K+</div>
                <div className="footer-label">Total Stock Value</div>
              </div>
              <div className="footer-stat">
                <div className="footer-value green">325</div>
                <div className="footer-label">Total Products Managed</div>
              </div>
              <div className="footer-stat">
                <div className="footer-value violet">6</div>
                <div className="footer-label">Active Suppliers</div>
              </div>
            </div>
            <div className="footer-meta">
              <span ref={reportDateRef} id="reportDate" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
