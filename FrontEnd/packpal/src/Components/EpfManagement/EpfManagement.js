import React, { useEffect, useMemo, useState } from "react";
import "./EpfManagement.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { api } from "../../lib/api"; // <-- axios instance

/* Money format */
const fmtMoney = (n) =>
  "LKR " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* Tiny toast */
const notify = (message, type = "info") => {
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
    max-width:420px; animation:epf-slideIn .3s ease; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  `;
  n.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  if (!document.querySelector("#epf-toast-anim")) {
    const style = document.createElement("style");
    style.id = "epf-toast-anim";
    style.textContent = `
      @keyframes epf-slideIn { from { transform:translateX(100%); opacity:0; } to{ transform:translateX(0); opacity:1; } }
      @keyframes epf-slideOut { from { transform:translateX(0); opacity:1; } to{ transform:translateX(100%); opacity:0; } }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(n);
  setTimeout(() => {
    n.style.animation = "epf-slideOut .3s ease";
    setTimeout(() => n.remove(), 300);
  }, 2500);
};

export default function EpfManagement() {
  const navigate = useNavigate();

  // Cards (from /contributions/summary)
  const [summary, setSummary] = useState({
    period: "",
    periodLabel: "",
    due: "",
    status: "Pending",
    baseTotal: 0,
    epfEmp: 0,
    epfEr: 0,
    epfTotal: 0,
    etf: 0,
    grandTotal: 0,
  });

  // Table rows (from /contributions)
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // Collapsible “New Payment” (hidden by default per your ask)
  const [npOpen, setNpOpen] = useState(false);

  // Current period (YYYY-MM) for summary/create
  const currentPeriod = useMemo(() => new Date().toISOString().slice(0, 7), []);

  /* ------- Load summary (pulls employees, computes EPF/ETF on server) ------- */
  async function loadSummary(period = currentPeriod) {
    try {
      const { data } = await api.get("/contributions/summary", { params: { period } });
      setSummary({
        period: data.period,
        periodLabel: data.periodLabel,
        due: data.due,
        status: data.status,
        baseTotal: data.baseTotal,
        epfEmp: data.epfEmp,
        epfEr: data.epfEr,
        epfTotal: data.epfTotal,
        etf: data.etf,
        grandTotal: data.grandTotal,
      });
    } catch (e) {
      notify(e?.response?.data?.message || "Failed to load summary", "error");
    }
  }

  /* ------- Load saved contribution rows for table ------- */
  async function loadRows(year = new Date().getFullYear()) {
    try {
      setLoadingRows(true);
      const { data } = await api.get("/contributions", { params: { year } });
      setRows(data.contributions || []);
    } catch (e) {
      notify(e?.response?.data?.message || "Failed to load contributions", "error");
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadRows();
    // welcome
    setTimeout(() => notify("EPF/ETF page ready — live data from employees.", "success"), 300);
  }, []); // eslint-disable-line

  /* ------- Create (save) this month's contribution row ------- */
  async function createThisMonth() {
    try {
      await api.post("/contributions", { period: currentPeriod });
      notify("Contribution created for this month.", "success");
      await Promise.all([loadRows(), loadSummary()]);
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to create";
      notify(msg, msg.includes("already exists") ? "warning" : "error");
    }
  }

  /* ------- Mark a row as paid ------- */
  async function markPaid(id) {
    try {
      await api.patch(`/contributions/${id}/pay`);
      notify("Marked as Paid.", "success");
      await Promise.all([loadRows(), loadSummary()]);
    } catch (e) {
      notify(e?.response?.data?.message || "Failed to update", "error");
    }
  }

  /* ------- Alert content (only when pending & before/near due date) ------- */
  const alertText = useMemo(() => {
    if (!summary?.due) return "";
    const dueDate = new Date(summary.due);
    const today = new Date();
    const ms = dueDate - today;
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (summary.status === "Paid") return ""; // hide after paid
    if (days < -1) return `EPF/ETF for ${summary.periodLabel} is OVERDUE. Total due: ${fmtMoney(summary.grandTotal)}`;
    if (days <= 7) return `EPF/ETF for ${summary.periodLabel} is due in ${days} day(s). Total due: ${fmtMoney(summary.grandTotal)}`;
    return `Upcoming payment for ${summary.periodLabel}. Total due: ${fmtMoney(summary.grandTotal)}`;
  }, [summary]);

  return (
    <div className="epf">
      <Sidebar />

      <div className="container">
        {/* Header */}
        <div className="content-header epf-header">
          <h1>EPF/ETF Management</h1>
          <p>Automatically calculated from your employee salaries</p>
        </div>

        {/* Due Alert (auto hides when Paid) */}
        {alertText && (
          <div className="alert alert-warning">
            <div className="alert-icon">⚠️</div>
            <div><strong>Action Required:</strong> {alertText}</div>
          </div>
        )}

        {/* KPI cards */}
        <div className="stats-grid">
          {/* EPF Employee 8% */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>🧑‍💼</div>
              <div className="stat-info">
                <h3>EPF (Employee 8%)</h3>
                <p>{summary.periodLabel}</p>
              </div>
            </div>
            <div className="stat-value">{fmtMoney(summary.epfEmp)}</div>
            <div className="stat-details"><span className="neutral">Base</span><span>{fmtMoney(summary.baseTotal)}</span></div>
          </div>

          {/* EPF Employer 12% */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}>🏢</div>
              <div className="stat-info">
                <h3>EPF (Employer 12%)</h3>
                <p>{summary.periodLabel}</p>
              </div>
            </div>
            <div className="stat-value">{fmtMoney(summary.epfEr)}</div>
            <div className="stat-details"><span className="neutral">EPF Total</span><span>{fmtMoney(summary.epfTotal)}</span></div>
          </div>

          {/* ETF 3% */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>🏦</div>
              <div className="stat-info">
                <h3>ETF (Employer 3%)</h3>
                <p>{summary.periodLabel}</p>
              </div>
            </div>
            <div className="stat-value">{fmtMoney(summary.etf)}</div>
            <div className="stat-details"><span className="neutral">—</span><span>3% of base</span></div>
          </div>

          {/* Grand Total */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>📊</div>
              <div className="stat-info">
                <h3>Total (EPF+ETF)</h3>
                <p>{summary.periodLabel}</p>
              </div>
            </div>
            <div className="stat-value">{fmtMoney(summary.grandTotal)}</div>
            <div className="stat-details">
              <span className="neutral">EPF (8%+12%)</span>
              <span>{fmtMoney(summary.epfTotal)}</span>
            </div>
          </div>

          {/* Pending count */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>⏰</div>
              <div className="stat-info">
                <h3>Pending Payments</h3>
                <p>All saved months</p>
              </div>
            </div>
            <div className="stat-value">{rows.filter(r => r.status === "Pending").length}</div>
            <div className="stat-details"><span className="neutral">Status</span><span>{summary.status}</span></div>
          </div>
        </div>

        {/* Main content */}
        <div className="main-content">
          {/* Collapsible “New Payment” (no manual base; server computes from employees) */}
          <div className={`new-payment-card ${npOpen ? "open" : "collapsed"}`}>
            {!npOpen ? (
              <div className="npc-collapsed">
                <button className="btn btn-pay npc-cta" onClick={() => setNpOpen(true)}>
                  + New Payment (save this month)
                </button>
              </div>
            ) : (
              <>
                <div className="npc-header">
                  <h3>Create This Month’s Contribution</h3>
                  <button className="npc-toggle" onClick={() => setNpOpen(false)}>Hide</button>
                </div>

                <div className="npc-preview">
                  <div className="row"><span>Period</span><strong>{summary.periodLabel}</strong></div>
                  <div className="row"><span>EPF (8% + 12%)</span><strong>{fmtMoney(summary.epfTotal)}</strong></div>
                  <div className="row"><span>ETF (3%)</span><strong>{fmtMoney(summary.etf)}</strong></div>
                  <div className="row total"><span>Grand Total</span><strong className="ok">{fmtMoney(summary.grandTotal)}</strong></div>
                </div>

                <div className="npc-actions">
                  <button className="btn btn-pay" onClick={createThisMonth}>Save Month</button>
                  <button className="btn btn-secondary" onClick={() => setNpOpen(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>

          {/* Table */}
          <div className="contributions-table">
            <div className="table-header">
              <div className="table-header-icon">📋</div>
              Contribution History &amp; Payments
            </div>
            <div className="table-content">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>EPF Amount (Emp+Er)</th>
                    <th>ETF Amount</th>
                    <th>Total (EPF+ETF)</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr><td colSpan={7}>Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7}>No contributions saved yet.</td></tr>
                  ) : rows.map(r => (
                    <tr key={r._id}>
                      <td><strong>{r.periodLabel}</strong></td>
                      <td>{fmtMoney(r.epf)}</td>
                      <td>{fmtMoney(r.etf)}</td>
                      <td><strong>{fmtMoney(r.total)}</strong></td>
                      <td><span className={`due ${r.status === "Pending" ? "danger" : "warn"}`}>{r.due}</span></td>
                      <td>
                        <span className={
                          "status-badge " + (r.status === "Paid" ? "status-paid" :
                                             r.status === "Pending" ? "status-pending" : "status-overdue")
                        }>
                          {r.status}
                        </span>
                      </td>
                      <td className="actions">
                        {r.status === "Pending" ? (
                          <button className="btn btn-pay" onClick={() => markPaid(r._id)}>Mark as Paid</button>
                        ) : <span>Completed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="sidebar-content">
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <button className="action-btn action-btn-primary" onClick={() => {
                const pend = rows.filter(r => r.status === "Pending");
                if (pend.length === 0) return notify("No pending rows.", "info");
                if (!window.confirm(`Mark ${pend.length} row(s) as Paid?`)) return;
                // Mark all pending one by one
                Promise.all(pend.map(p => api.patch(`/contributions/${p._id}/pay`)))
                  .then(() => { notify("All pending rows marked as Paid.", "success"); return Promise.all([loadRows(), loadSummary()]); })
                  .catch(e => notify(e?.response?.data?.message || "Bulk update failed", "error"));
              }}>
                💳 Pay All Pending
              </button>

              <button
                className="action-btn action-btn-secondary"
                onClick={() => {
                  const header = ["Period","EPF (Emp+Er)","ETF","Total","Due","Status"];
                  const lines = [
                    header.join(","),
                    ...rows.map(r =>
                      [r.periodLabel, r.epf, r.etf, r.total, r.due, r.status]
                        .map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")
                    ),
                  ].join("\n");
                  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "epf-etf-records.csv";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  notify("Records downloaded.", "success");
                }}
              >
                📥 Download Records
              </button>

              <button className="action-btn action-btn-secondary" onClick={() => navigate("/salarycal")}>
                👥 View Employee Details
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
