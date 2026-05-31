import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Reportshiru.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";

export default function Reports() {
  // ---------- Sample data (replace with API) ----------
  const products = useMemo(
    () => [
      { product: "Leather Tote",   category:"Bag", manager:"Aisha", completed:"2025-08-10", status:"Active", quality:"Passed",         inventory:"Ready" },
      { product: "Canvas Backpack",category:"Bag", manager:"John",  completed:"2025-08-12", status:"Active", quality:"Failed",         inventory:"Not Ready" },
      { product: "Travel Duffel",  category:"Bag", manager:"Maria", completed:"2025-08-15", status:"Active", quality:"Passed",         inventory:"Ready" },
      { product: "Wallet",         category:"Small Goods", manager:"Anna",  completed:"2025-08-18", status:"Active", quality:"Pending Review", inventory:"Not Ready" },
      { product: "Crossbody Purse",category:"Bag", manager:"Lisa",  completed:"2025-08-19", status:"Active", quality:"Passed",         inventory:"Ready" },
      { product: "Evening Clutch", category:"Small Goods", manager:"Sarah", completed:"2025-08-20", status:"Active", quality:"Passed",  inventory:"Ready" },
      { product: "Laptop Sleeve",  category:"Accessories", manager:"Mike",  completed:"2025-08-21", status:"Active", quality:"Failed",  inventory:"Not Ready" },
      { product: "Belt",           category:"Accessories", manager:"Aisha", completed:"2025-08-22", status:"Active", quality:"Passed",  inventory:"Ready" },
      { product: "Key Holder",     category:"Accessories", manager:"Anna",  completed:"2025-08-23", status:"Active", quality:"Pending Review", inventory:"Not Ready" },
      { product: "Messenger Bag",  category:"Bag", manager:"John",  completed:"2025-08-24", status:"Active", quality:"Failed",         inventory:"Not Ready" },
      { product: "Camera Strap",   category:"Accessories", manager:"Lisa",  completed:"2025-08-25", status:"Active", quality:"Passed",  inventory:"Ready" },
      { product: "Weekender",      category:"Bag", manager:"Mike",  completed:"2025-08-26", status:"Active", quality:"Failed",         inventory:"Not Ready" },
    ],
    []
  );

  // ---------- Filters ----------
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [quality, setQuality]     = useState("All");
  const [inventory, setInventory] = useState("All");

  const toDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);
  const inRange = (d, s, e) => (!s || d >= s) && (!e || d <= e);

  const filteredRows = useMemo(() => {
    const sd = toDate(startDate);
    const ed = toDate(endDate);
    return products.filter((p) => {
      const d = toDate(p.completed);
      const okDate = inRange(d, sd, ed);
      const okQ = quality === "All" || p.quality === quality;
      const okI = inventory === "All" || p.inventory === inventory;
      return okDate && okQ && okI;
    });
  }, [products, startDate, endDate, quality, inventory]);

  // ---------- KPIs ----------
  const { total, active, ready, passRate } = useMemo(() => {
    const total = filteredRows.length;
    const active = filteredRows.filter((x) => x.status === "Active").length;
    const ready  = filteredRows.filter((x) => x.inventory === "Ready").length;
    const passed = filteredRows.filter((x) => x.quality === "Passed").length;
    const passRate = total ? Math.round((passed / total) * 100) : 0;
    return { total, active, ready, passRate };
  }, [filteredRows]);

  // ---------- Charts ----------
  const barRef = useRef(null);
  const donutRef = useRef(null);

  const barRectsRef = useRef([]);
  const barTotalRef = useRef(0);
  const [tip, setTip] = useState({ show:false, x:0, y:0, label:"", value:0, percent:0 });

  const donutDataRef = useRef({ segments:[], cx:0, cy:0, rInner:0, rOuter:0, total:0 });
  const [dtip, setDTip] = useState({ show:false, x:0, y:0, label:"", value:0, percent:0 });

  useEffect(() => {
    const b = drawBarChart(barRef.current, filteredRows);
    barRectsRef.current = b.rects;
    barTotalRef.current = b.total;

    const d = drawDonutChart(donutRef.current, filteredRows);
    donutDataRef.current = d;
  }, [filteredRows]);

  // ------- bar tooltip -------
  const onBarMove = (e) => {
    const canvas = barRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = barRectsRef.current.find(
      (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.h
    );
    if (hit) {
      const percent = Math.round((hit.value / (barTotalRef.current || 1)) * 100);
      setTip({ show:true, x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12, label: hit.label, value: hit.value, percent });
    } else if (tip.show) setTip((t)=>({ ...t, show:false }));
  };
  const onBarLeave = () => setTip((t)=>({ ...t, show:false }));

  // ------- donut tooltip -------
  const onDonutMove = (e) => {
    const canvas = donutRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const { segments, cx, cy, rInner, rOuter, total } = donutDataRef.current;
    const dx = x - cx, dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r < rInner || r > rOuter || total === 0) {
      if (dtip.show) setDTip((t)=>({ ...t, show:false }));
      return;
    }

    let a = Math.atan2(dy, dx);
    const inArc = (ang, start, end) => {
      let aa = ang, s = start, e2 = end;
      if (e2 < s) e2 += Math.PI * 2;
      if (aa < s) aa += Math.PI * 2;
      return aa >= s && aa <= e2;
    };

    const seg = segments.find((s) => inArc(a, s.start, s.end));
    if (seg) {
      const percent = Math.round((seg.value / total) * 100);
      setDTip({ show:true, x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12, label: seg.label, value: seg.value, percent });
    } else if (dtip.show) setDTip((t)=>({ ...t, show:false }));
  };
  const onDonutLeave = () => setDTip((t)=>({ ...t, show:false }));

  // ---------- Export ----------
  const exportCSV = () => {
    const header = ["Product","Category","Manager","Completed","Status","Quality","Inventory"];
    const rows = filteredRows.map((r) => [ r.product, r.category, r.manager, r.completed, r.status, r.quality, r.inventory ]);
    const csv = toCSV([header, ...rows]);
    download(csv, "product_report.csv", "text/csv;charset=utf-8;");
  };
  const exportPDF = () => window.print();

  return (
    <div className="rpt">
      <Sidebarhiru/>

      <div className="page">
        <header className="topbar">
          <h1 className="page-title">Reports</h1>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={exportCSV}>
              <span className="icon">📄</span> Generate Report
            </button>
            <button className="avatar" title="Profile">👤</button>
          </div>
        </header>

        <main className="container" id="reportContent">
          {/* Filters */}
          <section className="filters card">
            <label><span>Start date</span><input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} /></label>
            <label><span>End date</span><input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} /></label>
            <label>
              <span>Quality</span>
              <select value={quality} onChange={(e)=>setQuality(e.target.value)}>
                <option>All</option><option>Passed</option><option>Failed</option><option>Pending Review</option>
              </select>
            </label>
            <label>
              <span>Inventory</span>
              <select value={inventory} onChange={(e)=>setInventory(e.target.value)}>
                <option>All</option><option>Ready</option><option>Not Ready</option>
              </select>
            </label>
          </section>

          {/* KPIs */}
          <section className="kpis">
            <article className="kpi card"><p className="muted">Total Products</p><p className="kpi-value">{total}</p></article>
            <article className="kpi card"><p className="muted">Active</p><p className="kpi-value">{active}</p></article>
            <article className="kpi card"><p className="muted">Inventory Ready</p><p className="kpi-value">{ready}</p></article>
            <article className="kpi card"><p className="muted">Pass Rate</p><p className="kpi-value">{passRate}%</p></article>
          </section>

          {/* Charts */}
          <section className="charts">
            <article className="card">
              <header className="card-header"><h3>Quality Outcomes</h3></header>
              <div className="bar-wrap">
                <canvas
                  ref={barRef}
                  width="560"
                  height="200"
                  aria-label="Quality chart"
                  onMouseMove={onBarMove}
                  onMouseLeave={onBarLeave}
                />
                {tip.show && (
                  <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
                    <div className="tip-title">{tip.label}</div>
                    <div><strong>{tip.value}</strong> items</div>
                    <div className="muted">{tip.percent}% of total</div>
                  </div>
                )}
              </div>
            </article>

            <article className="card">
              <header className="card-header"><h3>Inventory Readiness</h3></header>
              <div className="donut-wrap">
                <div className="donut-canvas">
                  <canvas
                    ref={donutRef}
                    width="200"
                    height="200"
                    aria-label="Inventory donut"
                    onMouseMove={onDonutMove}
                    onMouseLeave={onDonutLeave}
                  />
                  {dtip.show && (
                    <div className="chart-tooltip" style={{ left: dtip.x, top: dtip.y }}>
                      <div className="tip-title">{dtip.label}</div>
                      <div><strong>{dtip.value}</strong> items</div>
                      <div className="muted">{dtip.percent}% of total</div>
                    </div>
                  )}
                </div>
                <div className="legend">
                  <div><span className="dot dot-ready"></span> Ready</div>
                  <div><span className="dot dot-not"></span> Not Ready</div>
                </div>
              </div>
            </article>
          </section>

          {/* Table */}
          <section className="card table-card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>PRODUCT</th><th>CATEGORY</th><th>MANAGER</th><th>COMPLETED</th>
                    <th>STATUS</th><th>QUALITY</th><th>INVENTORY</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={`${r.product}-${i}`}>
                      <td>{r.product}</td><td>{r.category}</td><td>{r.manager}</td><td>{r.completed}</td><td>{r.status}</td>
                      <td><span className={`badge ${r.quality==="Passed"?"green":r.quality==="Failed"?"red":"amber"}`}>{r.quality}</span></td>
                      <td><span className={`badge ${r.inventory==="Ready"?"ready":"not"}`}>{r.inventory}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function toCSV(rows){
  return rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
}
function download(text, filename, mime){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Charts ---------- */
function drawBarChart(canvas, rows){
  if (!canvas) return { rects: [], total: 0 };
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const counts = {
    Passed: rows.filter(x=>x.quality==="Passed").length,
    Failed: rows.filter(x=>x.quality==="Failed").length,
    "Pending Review": rows.filter(x=>x.quality==="Pending Review").length,
  };
  const labels = Object.keys(counts);
  const values = labels.map(l=>counts[l]);
  const total = values.reduce((a,b)=>a+b,0);

  const pad = { left:48, right:16, top:8, bottom:30 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const yMax = 6;
  const stepX = chartW / labels.length;

  // skinny bars
  const barW = stepX * 0.12;
  const shrink = 0.8;

  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
  ctx.fillStyle = "#9ca3af"; ctx.font = "12px system-ui, Segoe UI";
  for (let i = 0; i <= yMax; i += 2){
    const gy = pad.top + chartH - (chartH * (i/yMax));
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke();
    const txt = String(i);
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, pad.left - tw - 6, gy + 4);
  }

  const axisY = h - pad.bottom;
  ctx.beginPath(); ctx.moveTo(pad.left, axisY); ctx.lineTo(w - pad.right, axisY); ctx.stroke();

  const rects = [];
  labels.forEach((lab, i)=>{
    const val = values[i];
    const xCenter = pad.left + stepX*(i + 0.5);
    const x = xCenter - barW/2;
    const bh = (val/yMax)*chartH*shrink;
    const y = axisY - bh;

    ctx.fillStyle = lab==="Passed" ? "#22c55e" : lab==="Failed" ? "#ef4444" : "#f59e0b";
    ctx.fillRect(x, y, barW, bh);

    rects.push({ label: lab, value: val, x, y, w: barW, h: bh });

    ctx.fillStyle = "#6b7280";
    const tw = ctx.measureText(lab).width;
    ctx.fillText(lab, xCenter - tw/2, h - 12);
  });

  return { rects, total };
}

function drawDonutChart(canvas, rows){
  if (!canvas) return { segments:[], cx:0, cy:0, rInner:0, rOuter:0, total:0 };

  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  // counts
  const ready = rows.filter(x=>x.inventory==="Ready").length;
  const notReady = rows.length - ready;
  const total = ready + notReady;

  const cx = w / 2;
  const cy = h / 2;
  const rOuter = Math.min(cx, cy) - 4;
  const rInner = rOuter * 0.6;

  // nothing to draw
  if (total === 0) {
    // faint ring background
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, rInner, Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
    return { segments:[], cx, cy, rInner, rOuter, total };
  }

  const segs = [
    { label: "Ready",     value: ready,    color: "#6d8bff" },
    { label: "Not Ready", value: notReady, color: "#cbd5ff" },
  ];

  // draw segments
  let start = -Math.PI / 2; // start at top
  const segments = [];

  segs.forEach(s => {
    const frac = s.value / total;
    const end = start + frac * Math.PI * 2;

    // ring slice
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, start, end);
    ctx.arc(cx, cy, rInner, end, start, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();

    segments.push({ label: s.label, value: s.value, start, end });
    start = end;
  });

  // center text
  ctx.fillStyle = "#374151";
  ctx.font = "14px system-ui, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${ready}/${total} Ready`, cx, cy);

  return { segments, cx, cy, rInner, rOuter, total };
}
