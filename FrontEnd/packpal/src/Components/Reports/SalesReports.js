// src/components/Reports/SalesReport.js
import React, { useEffect, useMemo, useState } from "react";
import "./SalesReports.css";
import Sidebarsa from "../Sidebar/Sidebarsa";
import { api } from "../../lib/api";              // ✅ shared axios instance
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===================== Branding / Assets ===================== */
const COMPANY = {
  name: "PackPal (Pvt) Ltd",
  address1: "No. 123, Galle Road, Colombo 04, Sri Lanka",
  phone: "+94 77 123 4567",
  email: "hello@packpal.com",
};
const LOGO_URL = "/logo.png";           // optional (public/logo.png)
const SIGNATURE_URL = "/signature.png"; // optional (public/signature.png)

/* ===================== Helpers ===================== */
const money = (n) =>
  "LKR " +
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const unpackList = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.transactions ?? payload?.items ?? payload?.data ?? [];

/* ===== SVG chart helpers ===== */
const scale = (val, min, max) => (max === min ? 0 : (val - min) / (max - min));
const BLUE_PALETTE   = ["#2563eb", "#60a5fa", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
const ORANGE_PALETTE = ["#ea580c", "#fb923c", "#fdba74", "#f97316", "#fb923c", "#c2410c"];

/* ===== Row normalizer ===== */
const toTx = (row) => ({
  id: String(
    row?.id ??
      row?._id ??
      row?.txId ??
      row?.transactionId ??
      Math.random().toString(36).slice(2, 10)
  ),
  date: row?.date ? String(row.date).slice(0, 10) : "",
  customer: row?.customer ?? "",
  customerId: row?.customerId ?? "",
  productName: row?.productName ?? row?.product?.name ?? "",
  qty: Number(row?.qty ?? 1),
  unitPrice: Number(row?.unitPrice ?? 0),
  discountPerUnit: Number(row?.discountPerUnit ?? 0),
  total: Number(row?.total ?? 0),
  status: (row?.status ?? "pending").toLowerCase(), // pending | paid | refund
});

/* ===== Helper: try multiple API paths and pick the one that works ===== */
async function getTxWithFallbacks(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p);
      console.log("[SalesReport] Using transactions path:", p);
      return { path: p, data: res.data };
    } catch (e) {
      lastErr = e;
      const full = (api.defaults?.baseURL || "") + p;
      console.warn("[SalesReport] Failed:", p, e?.response?.status || e.message, "URL:", full);
    }
  }
  throw lastErr || new Error("All endpoints failed");
}

/* ===== Small utility: load image -> dataURL for jsPDF (safe to fail) ===== */
const imageToDataUrl = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/* ===================== Component ===================== */
export default function SalesReport() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [range, setRange] = useState("30"); // 7 | 30 | 90 | all
  const [generatedAt, setGeneratedAt] = useState("");

  const fetchTx = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await getTxWithFallbacks([
        "transactions",
        "api/transactions",
        "/transactions",
        "/api/transactions",
      ]);
      setTxs(unpackList(data).map(toTx));
    } catch (e) {
      const url = e?.config ? (e.config.baseURL || "") + (e.config.url || "") : "";
      setErr(
        (e?.response?.data?.message || e.message || "Failed to load transactions") +
          (url ? `\nURL: ${url}` : "")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTx();
    const onChanged = () => fetchTx();
    window.addEventListener("tx:changed", onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener("tx:changed", onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, []);

  /* -------- Filter by date range -------- */
  const rowsInRange = useMemo(() => {
    if (range === "all") return txs.slice();
    const days = parseInt(range, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return txs.filter((t) => {
      const d = new Date(t.date);
      return !isNaN(d) && d >= cutoff;
    });
  }, [txs, range]);

  /* -------- Analytics + Series for Charts -------- */
  const analytics = useMemo(() => {
    const norm = (s) => (s || "").toLowerCase();
    const paid    = rowsInRange.filter((t) => norm(t.status) === "paid");
    const pending = rowsInRange.filter((t) => norm(t.status) === "pending");
    const refund  = rowsInRange.filter((t) => norm(t.status) === "refund");

    const paidRevenue = paid.reduce((s, t) => s + (Number(t.total) || 0), 0);
    const pendingAmt  = pending.reduce((s, t) => s + (Number(t.total) || 0), 0);
    const refundAmt   = refund.reduce((s, t) => s + (Number(t.total) || 0), 0);
    const aov         = paid.length ? paidRevenue / paid.length : 0;

    // Revenue over time (paid only)
    const byDateMap = new Map();
    paid.forEach((t) => {
      const d = t.date || "—";
      byDateMap.set(d, (byDateMap.get(d) || 0) + (Number(t.total) || 0));
    });
    const byDate = Array.from(byDateMap.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([date, value]) => ({ date, value }));

    // Sales by product (paid only)
    const byProductMap = new Map();
    for (const t of paid) {
      const key = t.productName || "—";
      const rec =
        byProductMap.get(key) || {
          product: key,
          orders: 0,
          qty: 0,
          discountTotal: 0,
          revenue: 0,
          avgPrice: 0,
        };
      rec.orders += 1;
      rec.qty += Number(t.qty) || 0;
      rec.discountTotal += (Number(t.discountPerUnit) || 0) * (Number(t.qty) || 0);
      rec.revenue += Number(t.total) || 0;
      byProductMap.set(key, rec);
    }
    const byProductAll = Array.from(byProductMap.values()).map((r) => ({
      ...r,
      avgPrice: r.qty ? r.revenue / r.qty : 0,
    }));

    // Top customers (paid only)
    const byCustomerMap = new Map();
    for (const t of paid) {
      const key = t.customer || t.customerId || "—";
      const rec = byCustomerMap.get(key) || { customer: key, orders: 0, revenue: 0 };
      rec.orders += 1;
      rec.revenue += Number(t.total) || 0;
      byCustomerMap.set(key, rec);
    }
    const byCustomer = Array.from(byCustomerMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      paidRevenue,
      pendingAmt,
      refundAmt,
      aov,
      paidCount: paid.length,
      allCount: rowsInRange.length,
      uniqueCustomers: new Set(
        rowsInRange.map((t) => t.customer || t.customerId).filter(Boolean)
      ).size,
      byDate,          // <-- series for LineChart
      byProductAll,
      byCustomer,
    };
  }, [rowsInRange]);

  /* ===================== PDF Export (jsPDF) ===================== */
  const exportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true }); // 595.28 x 841.89
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36; // 0.5 inch

    // Try to embed images (silently skip if not available)
    const logoData = await imageToDataUrl(LOGO_URL);
    const signData = await imageToDataUrl(SIGNATURE_URL);

    /* ----- Header ----- */
    let y = margin;
    if (logoData) {
      const logoH = 38;
      const logoW = 38;
      doc.addImage(logoData, "PNG", margin, y, logoW, logoH);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(COMPANY.name, margin + (logoData ? 46 : 0), y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    const addr = `${COMPANY.address1}`;
    const contact = `Phone: ${COMPANY.phone}  |  Email: ${COMPANY.email}`;
    doc.text(addr, margin + (logoData ? 46 : 0), y + 28);
    doc.text(contact, margin + (logoData ? 46 : 0), y + 42);

    // Report title + generated at (right)
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const title = "Sales Report";
    doc.text(title, pageW - margin, y + 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Generated: ${generatedAt || new Date().toLocaleString()}`,
      pageW - margin,
      y + 32,
      { align: "right" }
    );

    // Divider
    y += 56;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    /* ----- KPI “cards” ----- */
    const kpis = [
      { label: "Paid Revenue", value: money(analytics.paidRevenue) },
      { label: "Pending Amount", value: money(analytics.pendingAmt) },
      { label: "Refund Amount", value: money(analytics.refundAmt) },
      { label: "Avg Order Value", value: money(analytics.aov) },
      { label: "Paid Orders", value: String(analytics.paidCount) },
      { label: "Orders (All)", value: String(analytics.allCount) },
      { label: "Unique Customers", value: String(analytics.uniqueCustomers) },
      { label: "Generated", value: generatedAt || "—" },
    ];

    const cardW = (pageW - margin * 2 - 24) / 2; // 2 per row
    const cardH = 54;
    doc.setFontSize(11);
    for (let i = 0; i < kpis.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (cardW + 24);
      const yy = y + row * (cardH + 12);

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.6);
      doc.roundedRect(x, yy, cardW, cardH, 6, 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(kpis[i].value, x + 12, yy + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(99, 110, 135);
      doc.text(kpis[i].label.toUpperCase(), x + 12, yy + 38);
    }
    y += Math.ceil(kpis.length / 2) * (cardH + 12) + 12;

    /* ----- Table: Sales by Product (Paid) ----- */
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Analysis — Sales by Product (Paid)", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [243, 244, 246], textColor: 0 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      head: [["Product", "Orders", "Qty", "Avg Price", "Discount Total", "Revenue"]],
      body: analytics.byProductAll.map((r) => [
        r.product || "—",
        r.orders,
        r.qty,
        money(r.avgPrice),
        money(r.discountTotal),
        money(r.revenue),
      ]),
      didDrawPage: (data) => drawFooter(doc),
    });
    y = doc.lastAutoTable?.finalY || y;

    /* ----- Table: Top Customers (Paid) ----- */
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top Customers (Paid)", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [243, 244, 246], textColor: 0 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      head: [["Customer", "Orders", "Revenue"]],
      body: analytics.byCustomer.map((r) => [r.customer || "—", r.orders, money(r.revenue)]),
      didDrawPage: () => drawFooter(doc),
    });
    y = doc.lastAutoTable?.finalY || y;

    /* ----- Signature Section on the last page ----- */
    y += 36;
    if (y + 110 > pageH - margin) {
      doc.addPage();
      y = margin + 8;
      drawFooter(doc);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Authorization", margin, y);
    y += 18;

    // Left: signature line
    doc.setDrawColor(0);
    doc.line(margin, y + 32, margin + 220, y + 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Authorized Signature", margin, y + 48);

    // Right: optional signature image
    if (SIGNATURE_URL) {
      const signData = await imageToDataUrl(SIGNATURE_URL);
      if (signData) {
        doc.addImage(signData, "PNG", pageW - margin - 160, y, 160, 60);
        doc.setFontSize(9);
        doc.text("Signed by: Finance Manager", pageW - margin - 160, y + 74);
      }
    }

    drawFooter(doc);

    const filename = `Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  const drawFooter = (doc) => {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const pageNumber = doc.internal.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `© ${new Date().getFullYear()} ${COMPANY.name} • ${COMPANY.email}`,
      margin,
      pageH - 18
    );
    doc.text(`Page ${pageNumber}`, pageW - margin, pageH - 18, { align: "right" });
  };

  /* ===================== Tiny SVG Charts ===================== */
  const ChartCard = ({ title, titleColor, children }) => (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: titleColor }}>
        {title}
      </div>
      {children}
    </div>
  );

  const LineChart = ({ data, colors = ORANGE_PALETTE, w = 560, h = 220, pad = 24 }) => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    const points = data.map((d, i) => {
      const x = pad + (innerW * i) / Math.max(1, data.length - 1);
      const y = pad + innerH * (1 - scale(d.value, min, max));
      return `${x},${y}`;
    });

    const y0 = pad + innerH;
    const x0 = pad;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "220px" }}>
        <line x1={x0} y1={pad} x2={x0} y2={y0} stroke="#e5e7eb" />
        <line x1={x0} y1={y0} x2={w - pad} y2={y0} stroke="#e5e7eb" />
        {points.length > 1 && (
          <polyline fill="none" stroke={colors[0]} strokeWidth="2.5" points={points.join(" ")} />
        )}
        {data.map((d, i) => {
          const x = pad + (innerW * i) / Math.max(1, data.length - 1);
          const y = pad + innerH * (1 - scale(d.value, min, max));
          return <circle key={i} cx={x} cy={y} r="3" fill={colors[1]} />;
        })}
        {data.map((d, i) => {
          const x = pad + (innerW * i) / Math.max(1, data.length - 1);
          const y = y0 + 14;
          const label = (d.date || "").slice(5);
          return (
            <text key={i} x={x} y={y} fontSize="10" textAnchor="middle" fill="#637087">
              {label}
            </text>
          );
        })}
        <text x={w - pad} y={pad - 6} fontSize="10" textAnchor="end" fill="#637087">
          {money(max)}
        </text>
      </svg>
    );
  };

  const DonutChart = ({ series, colors = BLUE_PALETTE, w = 280, h = 220 }) => {
    const cx = w / 2;
    const cy = h / 2 + 10;
    const r = Math.min(w, h) / 2 - 16;
    const thickness = 26;

    const total = series.reduce((s, x) => s + x.value, 0) || 1;
    let start = -Math.PI / 2;

    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "280px", height: "220px" }}>
          {series.map((s, i) => {
            const angle = (s.value / total) * Math.PI * 2;
            const end = start + angle;
            const largeArc = angle > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(end);
            const y2 = cy + r * Math.sin(end);
            const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
            const stroke = colors[i % colors.length];
            const el = (
              <path key={i} d={path} fill="none" stroke={stroke} strokeWidth={thickness} strokeLinecap="round" />
            );
            start = end;
            return el;
          })}
          <text x={cx} y={cy + 4} fontSize="12" fontWeight="700" textAnchor="middle" fill="#111827">
            {total ? money(total) : "—"}
          </text>
        </svg>

        {/* Legend */}
        <div style={{ minWidth: 160 }}>
          {series.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: colors[i % colors.length],
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>{s.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#637087" }}>{money(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ===================== UI ===================== */
  return (
    <div className="page-wrap reports-page">
      <Sidebarsa />

      <main className="content reports-page">
        <h1 className="page-title">Sales Report</h1>
        <p className="muted">Range-aware analytics with official PDF export.</p>

        {loading && <div className="muted">Loading…</div>}
        {err && (
          <pre className="error" style={{ color: "#b91c1c", marginBottom: 8, whiteSpace: "pre-wrap" }}>
            {err}
          </pre>
        )}

        {/* Controls */}
        <section className="section">
          <div className="head">
            <h3>Controls</h3>
          </div>
          <div className="body">
            <div className="grid grid-2">
              <div>
                <label>Date Range</label>
                <select value={range} onChange={(e) => setRange(e.target.value)}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <button className="btn" onClick={fetchTx}>Reload</button>
                <button className="btn primary" onClick={() => setGeneratedAt(new Date().toLocaleString())}>
                  Generate
                </button>
                <button className="btn" onClick={exportPdf}>
                  Export PDF (Official)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="section">
          <div className="head">
            <h3>KPIs</h3>
          </div>
          <div className="body">
            <div className="stats">
              <div className="card stat"><div className="v">{money(analytics.paidRevenue)}</div><div className="l">Paid Revenue</div></div>
              <div className="card stat"><div className="v">{money(analytics.pendingAmt)}</div><div className="l">Pending Amount</div></div>
              <div className="card stat"><div className="v">{money(analytics.refundAmt)}</div><div className="l">Refund Amount</div></div>
              <div className="card stat"><div className="v">{money(analytics.aov)}</div><div className="l">Avg Order Value</div></div>
            </div>
            <div className="stats" style={{ marginTop: 12 }}>
              <div className="card stat"><div className="v">{analytics.paidCount}</div><div className="l">Paid Orders</div></div>
              <div className="card stat"><div className="v">{analytics.allCount}</div><div className="l">Orders (All)</div></div>
              <div className="card stat"><div className="v">{analytics.uniqueCustomers}</div><div className="l">Unique Customers</div></div>
              <div className="card stat"><div className="v">{generatedAt || "—"}</div><div className="l">Generated</div></div>
            </div>
          </div>
        </section>

        {/* ===== Analysis Charts (TWO GRAPHS) ===== */}
        <section className="section analysis">
          <div className="head">
            <h3>Analysis Charts</h3>
          </div>
          <div className="body">
            <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
              <ChartCard title="Revenue Over Time (Paid)" titleColor="#9a3412">
                {analytics.byDate.length === 0 ? (
                  <div className="muted">No paid transactions in this range.</div>
                ) : (
                  <LineChart data={analytics.byDate} colors={ORANGE_PALETTE} />
                )}
              </ChartCard>

              <ChartCard title="Status Breakdown (Amount)" titleColor="#1e3a8a">
                <DonutChart
                  series={[
                    { label: "Paid",    value: analytics.paidRevenue },
                    { label: "Pending", value: analytics.pendingAmt },
                    { label: "Refund",  value: analytics.refundAmt },
                  ]}
                  colors={BLUE_PALETTE}
                />
              </ChartCard>
            </div>
          </div>
        </section>

        {/* Sales by Product */}
        <section className="section">
          <div className="head"><h3>Analysis — Sales by Product (Paid)</h3></div>
          <div className="body">
            {analytics.byProductAll.length === 0 ? (
              <p className="muted">No paid transactions in this range.</p>
            ) : (
              <div className="table-wrap">
                <table className="report-table">
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "20%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="right">Orders</th>
                      <th className="right">Qty</th>
                      <th className="right">Avg Price</th>
                      <th className="right">Discount Total</th>
                      <th className="right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byProductAll.map((r) => (
                      <tr key={r.product}>
                        <td className="truncate">{r.product}</td>
                        <td className="right">{r.orders}</td>
                        <td className="right">{r.qty}</td>
                        <td className="right">{money(r.avgPrice)}</td>
                        <td className="right">{money(r.discountTotal)}</td>
                        <td className="right">{money(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Top Customers */}
        <section className="section">
          <div className="head"><h3>Top Customers (Paid)</h3></div>
          <div className="body">
            {analytics.byCustomer.length === 0 ? (
              <p className="muted">No paid transactions in this range.</p>
            ) : (
              <div className="table-wrap">
                <table className="report-table">
                  <colgroup>
                    <col style={{ width: "60%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "25%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="right">Orders</th>
                      <th className="right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byCustomer.map((r) => (
                      <tr key={r.customer}>
                        <td className="truncate">{r.customer}</td>
                        <td className="right">{r.orders}</td>
                        <td className="right">{money(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
