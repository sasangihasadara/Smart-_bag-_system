import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Pdashboard.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";
import { api } from "../../lib/api2"; // your shared axios instance

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const formatDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d).slice(0,10); }
};

export default function Pdashboard() {
  // -------- State --------
  const [items, setItems] = useState([]);     // sewing instructions from server
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Quick-add modal
  const dialogRef = useRef(null);
  const [fBag, setFBag] = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fDeadline, setFDeadline] = useState("");
  const [fPriority, setFPriority] = useState("High");
  const [fDetails, setFDetails] = useState("");

  const openAdd = () => {
    setFBag(""); setFPerson(""); setFDeadline(""); setFPriority("High"); setFDetails("");
    dialogRef.current?.showModal?.();
  };
  const closeModal = () => dialogRef.current?.close?.();

  // -------- Fetch from API --------
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/sewing-instructions");
      const mapped = (data.items || []).map((i) => ({
        id: i._id,
        bag: i.bag,
        details: i.details || "",
        person: i.person,
        deadline: formatDate(i.deadline),
        priority: i.priority,
        status: i.status,
        createdAt: i.createdAt,
        qcDate: i.qcDate || null,
        qcNote: i.qcNote || "",
      }));
      setItems(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Live refresh when other pages/tabs change data
  useEffect(() => {
    const onBcast = () => fetchItems();
    const onStorage = (e) => {
      if (e.key === "sewing:lastUpdate" || e.key === "qc:lastUpdate") fetchItems();
    };
    const onVis = () => { if (document.visibilityState === "visible") fetchItems(); };

    window.addEventListener("sewing:changed", onBcast);
    window.addEventListener("quality:changed", onBcast);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);

    const t = setInterval(fetchItems, 30000);
    return () => {
      window.removeEventListener("sewing:changed", onBcast);
      window.removeEventListener("quality:changed", onBcast);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [fetchItems]);

  // -------- Derived values --------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        x.bag.toLowerCase().includes(q) ||
        x.person.toLowerCase().includes(q) ||
        (x.details || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const top5 = useMemo(() => {
    const copy = [...filtered].sort((a, b) => {
      const ad = a.deadline || "";
      const bd = b.deadline || "";
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      const ac = a.createdAt || "";
      const bc = b.createdAt || "";
      return (bc > ac ? 1 : bc < ac ? -1 : 0);
    });
    return copy.slice(0, 5);
  }, [filtered]);

  // --- Quality buckets for dashboard containers ---
  const passedList = useMemo(
    () => items
      .filter((x) => x.status === "Done")
      .sort((a, b) => (b.qcDate || b.createdAt || "").localeCompare(a.qcDate || a.createdAt || "")),
    [items]
  );
  const failedList = useMemo(
    () => items
      .filter((x) => x.status === "Failed")
      .sort((a, b) => (b.qcDate || b.createdAt || "").localeCompare(a.qcDate || a.createdAt || "")),
    [items]
  );

  // KPI counts
  const kpi = useMemo(() => {
    const active = items.length;
    const passed = passedList.length;                // Done
    const failed = failedList.length;                // Failed
    const ready = passed;                            // Ready for inventory == passed
    return { active, passed, failed, ready };
  }, [items, passedList, failedList]);

  // -------- Badges --------
  const badgePriority = (p) => {
    const cls = p === "High" ? "high" : p === "Medium" ? "medium" : "low";
    return <span className={`badge ${cls}`}>{p}</span>;
  };

  const badgeStatus = (s) => {
    const map = { "In Progress": "info", Pending: "pending", "Quality Check": "qc", Done: "low", Failed: "failed" };
    return <span className={`badge ${map[s] || "pending"}`}>{s}</span>;
  };

  // -------- Export CSV --------
  const onGenerateReport = () => {
    const hdr = ["Bag", "Person", "Deadline", "Priority", "Status", "Details"];
    const rowsFull = items.map((i) => [i.bag, i.person, i.deadline, i.priority, i.status, i.details || ""]);
    const rowsTop = top5.map((i) => [i.bag, i.person, i.deadline, i.priority, i.status, i.details || ""]);
    const toCSV = (rows) => rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const csv =
      `Dashboard — Sewing Instructions (All)\n${toCSV([hdr, ...rowsFull])}\n\n` +
      `Top 5 by Deadline\n${toCSV([hdr, ...rowsTop])}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sewing_dashboard_report.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // -------- Quick add --------
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!fBag || !fPerson || !fDeadline) return;
    try {
      await api.post("/api/sewing-instructions", {
        bag: fBag,
        person: fPerson,
        deadline: fDeadline,
        priority: fPriority,
        details: fDetails || "",
        status: "In Progress",
      });
      closeModal();
      await fetchItems();
    } catch (err) {
      console.error(err);
      alert("Failed to create instruction");
    }
  };

  if (loading) {
    return (
      <div className="pd">
        <Sidebarhiru />
        <main className="container">Loading…</main>
      </div>
    );
  }

  return (
    <div className="pd">
      <Sidebarhiru />

      <header className="topbar">
        <h1 className="title">Dashboard</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={onGenerateReport}>
            <span className="icon">📄</span> Generate Report
          </button>
          <button className="avatar" title="Profile">👤</button>
        </div>
      </header>

      <main className="container">
        {/* KPIs */}
        <section className="kpi-grid">
          <article className="kpi">
            <div className="kpi-icon clock">🕒</div>
            <div className="kpi-body">
              <p className="kpi-title">Active Instructions</p>
              <p className="kpi-value">{kpi.active}</p>
            </div>
          </article>

          <article className="kpi">
            <div className="kpi-icon passed">✅</div>
            <div className="kpi-body">
              <p className="kpi-title">Quality Passed</p>
              <p className="kpi-value">{kpi.passed}</p>
            </div>
          </article>

          <article className="kpi">
            <div className="kpi-icon failed">❌</div>
            <div className="kpi-body">
              <p className="kpi-title">Quality Failed</p>
              <p className="kpi-value">{kpi.failed}</p>
            </div>
          </article>

          <article className="kpi">
            <div className="kpi-icon inventory">📦</div>
            <div className="kpi-body">
              <p className="kpi-title">Ready for Inventory</p>
              <p className="kpi-value">{kpi.ready}</p>
            </div>
          </article>
        </section>

        {/* Toolbar */}
        <section className="toolbar card">
          <p className="muted">
            Welcome back! Track production, check quality, and export reports.
          </p>

  {/* search */}
          <div className="toolbar-right">
            <div className="search">
              <span className="icon">🔎</span>
              <input
                type="search"
                placeholder="Search by bag, person, or details…"
                aria-label="Search sewing instructions"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-ghost" onClick={() => window.location.assign("/sewing-instructions")}>
              ✂️ <span className="hide-sm">Manage Instructions</span>
            </button>

            <button className="btn btn-primary" onClick={openAdd}>
              ➕ Add Instruction
            </button>
          </div>
        </section>

        {/* Tables */}
        <section className="grid-2">
          {/* Top 5 Sewing Instructions */}
          <article className="card">
            <header className="card-header">
              <h2>Sewing Instructions (Top 5 by Deadline)</h2>
              <span className="muted">{items.length} total</span>
            </header>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bag</th>
                    <th>Person</th>
                    <th>Deadline</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="bag-title">{row.bag}</p>
                        <p className="bag-sub">{row.details || ""}</p>
                      </td>
                      <td>{row.person}</td>
                      <td className="nowrap">{row.deadline}</td>
                      <td>{badgePriority(row.priority)}</td>
                      <td>{badgeStatus(row.status)}</td>
                    </tr>
                  ))}
                  {top5.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>
                        No instructions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Quality Summary (neat & clean) */}
          <article className="card">
            <header className="card-header">
              <h2>Quality Summary</h2>
              <span className="muted">latest updates</span>
            </header>

            <div className="qs">
              <div className="qs-grid">
                {/* PASSED */}
                <section className="qs-col">
                  <header className="qs-col-head">
                    <h3>Quality Passed</h3>
                    <span className="qs-count">{passedList.length}</span>
                  </header>
                  <ul className="qs-list">
                    {passedList.slice(0, 5).map((it) => (
                      <li className="qs-item" key={it.id} title={`${it.bag} • ${it.person}`}>
                        <span className="dot ok" />
                        <span className="qs-line">
                          <strong className="qs-bag">{it.bag}</strong>
                          <em className="qs-by">by {it.person}</em>
                          <small className="qs-date">
                            {(it.qcDate || it.createdAt || "").slice(0, 10)}
                          </small>
                        </span>
                      </li>
                    ))}
                    {passedList.length === 0 && <li className="qs-empty">No passed items yet.</li>}
                  </ul>
                </section>

                {/* FAILED */}
                <section className="qs-col">
                  <header className="qs-col-head">
                    <h3>Quality Failed</h3>
                    <span className="qs-count">{failedList.length}</span>
                  </header>
                  <ul className="qs-list">
                    {failedList.slice(0, 5).map((it) => (
                      <li className="qs-item" key={it.id} title={`${it.bag} • ${it.person}`}>
                        <span className="dot bad" />
                        <span className="qs-line">
                          <strong className="qs-bag">{it.bag}</strong>
                          <em className="qs-by">by {it.person}</em>
                          <small className="qs-date">
                            {(it.qcDate || it.createdAt || "").slice(0, 10)}
                          </small>
                          {it.qcNote && <span className="qs-note">❌ {it.qcNote}</span>}
                        </span>
                      </li>
                    ))}
                    {failedList.length === 0 && <li className="qs-empty">No failures 🎉</li>}
                  </ul>
                </section>
              </div>
            </div>
          </article>
        </section>
      </main>

      {/* Quick Add Modal */}
      <dialog ref={dialogRef} className="modal" onClose={closeModal}>
        <form className="modal-card" onSubmit={onSubmit} method="dialog">
          <h3 id="formTitle">Add Instruction</h3>

          <div className="grid">
            <label>
              Bag
              <input value={fBag} onChange={(e) => setFBag(e.target.value)} required />
            </label>

            <label>
              Person
              <input value={fPerson} onChange={(e) => setFPerson(e.target.value)} required />
            </label>

            <label>
              Deadline
              <input
                type="date"
                value={fDeadline}
                onChange={(e) => setFDeadline(e.target.value)}
                required
              />
            </label>

            <label>
              Priority
              <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} required>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>

            <label className="span-2">
              Details
              <textarea
                rows={3}
                placeholder="materials, size, notes"
                value={fDetails}
                onChange={(e) => setFDetails(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
