import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Attendance.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";
import "@fortawesome/fontawesome-free/css/all.min.css";

const toast = (m, t = "info") => alert(`${t.toUpperCase()}: ${m}`);

const clamp0to31 = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (n < 0) return 0;
  if (n > 31) return 31;
  return n;
};

const anyOver31 = (obj) =>
  ["workingDays", "leaveAllowed", "noPayLeave", "leaveTaken"].some(
    (k) => Number(obj?.[k] ?? 0) > 31
  );

const deriveNoPay = (leaveTaken, leaveAllowed) => {
  const lt = Number(leaveTaken || 0);
  const la = Number(leaveAllowed || 0);
  const np = Math.max(0, lt - la);
  return np > 31 ? 31 : np;
};

// utils
const norm = (s) => String(s ?? "").toLowerCase();

export default function Attendance() {
  const [employees, setEmployees] = useState([]);   // [{ EmpId, Emp_Name }]
  const [empLoading, setEmpLoading] = useState(true);

  const [rows, setRows] = useState([]);             // attendance rows from DB
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    empId: "",
    period: "",
    workingDays: "",
    overtimeHrs: "",
    leaveAllowed: "",
    noPayLeave: "",
    leaveTaken: ""
  });

  const [editing, setEditing] = useState(null);

  // ===== Search (EmpId only) =====
  const [q, setQ] = useState("");
  const searchRef = useRef(null);

  async function loadEmployees() {
    try {
      setEmpLoading(true);
      const { data } = await api.get("/finances/min-list");
      setEmployees(data.employees || []);
    } catch (e) {
      toast(
        e?.response?.data?.message ||
          "Failed to load employees (GET /finances/min-list).",
        "error"
      );
    } finally {
      setEmpLoading(false);
    }
  }

  async function loadAttendance() {
    try {
      setLoading(true);
      const { data } = await api.get("/attendance?includeEmployee=1");
      setRows(data.attendance || []);
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadAttendance();
  }, []);

  // quick focus shortcut for search
  useEffect(() => {
    const onSlash = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  // CREATE
  async function create() {
    if (!form.empId || !form.period)
      return toast("Employee and period are required", "warning");

    const autoNoPay = deriveNoPay(form.leaveTaken, form.leaveAllowed);
    const payload = {
      empId: form.empId,
      period: form.period,
      workingDays: Number(form.workingDays || 0),
      overtimeHrs: Number(form.overtimeHrs || 0),
      leaveAllowed: Number(form.leaveAllowed || 0),
      noPayLeave: autoNoPay,
      leaveTaken: Number(form.leaveTaken || 0)
    };

    if (anyOver31(payload)) {
      return toast(
        "Working Days, Leave Allowed, No Pay Leave, and Leave Taken cannot exceed 31.",
        "warning"
      );
    }

    try {
      const { data } = await api.post("/attendance", payload);
      setRows((p) => [...p, data]);
      setAddOpen(false);
      setForm({
        empId: "",
        period: "",
        workingDays: "",
        overtimeHrs: "",
        leaveAllowed: "",
        noPayLeave: "",
        leaveTaken: ""
      });
      try { await loadAttendance(); } catch {}
      toast("Attendance added", "success");
    } catch (e) {
      toast(e?.response?.data?.message || "Add failed", "error");
    }
  }

  // UPDATE
  async function saveEdit() {
    const id = editing?._id;
    if (!id) return toast("Missing _id", "error");

    const autoNoPay = deriveNoPay(editing.leaveTaken, editing.leaveAllowed);
    const payload = {
      empId: editing.empId,
      period: editing.period,
      workingDays: Number(editing.workingDays || 0),
      overtimeHrs: Number(editing.overtimeHrs || 0),
      leaveAllowed: Number(editing.leaveAllowed || 0),
      noPayLeave: autoNoPay,
      leaveTaken: Number(editing.leaveTaken || 0)
    };

    if (anyOver31(payload)) {
      return toast(
        "Working Days, Leave Allowed, No Pay Leave, and Leave Taken cannot exceed 31.",
        "warning"
      );
    }

    try {
      const { data } = await api.put(`/attendance/${id}`, payload);
      setRows((p) => p.map((r) => (r._id === id ? data : r)));
      setEditing(null);
      try { await loadAttendance(); } catch {}
      toast("Updated", "success");
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", "error");
    }
  }

  // DELETE
  async function remove(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api.delete(`/attendance/${id}`);
      setRows((p) => p.filter((r) => r._id !== id));
      toast("Deleted", "warning");
    } catch (e) {
      toast(e?.response?.data?.message || "Delete failed", "error");
    }
  }

  // onChange helpers for add/edit numeric fields (auto-recompute noPayLeave)
  const onAddNum = (key) => (e) => {
    const vRaw = e.target.value;
    const v = vRaw === "" ? "" : clamp0to31(vRaw);

    setForm((s) => {
      const next = { ...s, [key]: v };
      if (key === "leaveAllowed" || key === "leaveTaken") {
        const autoNoPay = deriveNoPay(
          key === "leaveTaken" ? v : next.leaveTaken,
          key === "leaveAllowed" ? v : next.leaveAllowed
        );
        next.noPayLeave = autoNoPay;
      }
      return next;
    });
  };

  const onEditNum = (key) => (e) => {
    const vRaw = e.target.value;
    const v = vRaw === "" ? "" : clamp0to31(vRaw);

    setEditing((s) => {
      const next = { ...s, [key]: v };
      if (key === "leaveAllowed" || key === "leaveTaken") {
        const autoNoPay = deriveNoPay(
          key === "leaveTaken" ? v : next.leaveTaken,
          key === "leaveAllowed" ? v : next.leaveAllowed
        );
        next.noPayLeave = autoNoPay;
      }
      return next;
    });
  };

  /* ===== Filtered rows: EmpId only ===== */
  const filteredRows = useMemo(() => {
    const query = norm(q);
    if (!query) return rows;
    return rows.filter((r) => norm(r.empId).includes(query));
  }, [rows, q]);

  const showing = filteredRows.length;
  const total = rows.length;

  return (
    <div className="Attendance page-wrap">
      <Sidebar />
      <div className="container">
        <h1>Employee Salary Management</h1>
        <p>Real-time salary insights and employee payroll management</p>

        <div className="section">
          <div className="nav">
            <NavLink to="/finance/employees" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>👥 Employees</NavLink>
            <NavLink to="/finance/attendance" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>📅 Attendance</NavLink>
            <NavLink to="/finance/advance" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>💰 Advance</NavLink>
            <NavLink to="/finance/salary" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>📊 Salary Management</NavLink>
            <NavLink to="/finance/transfers" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>💸 Salary Transfers</NavLink>
          </div>

          {/* ===== Row 1: Search only (left) ===== */}
          <div className="search-row">
            <div className="pretty-search">
              <div className="chip">Emp ID</div>
              <div className="input-wrap">
                <i className="fa fa-hashtag" />
                <input
                  ref={searchRef}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Type an Employee ID (Hint: press / to focus)"
                  aria-label="Search by Employee ID"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    aria-label="Clear search"
                    className="clear"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="count" title="Matches">
                {loading ? "…" : `${showing}/${total}`}
              </div>
            </div>
          </div>

          {/* helper line */}
          <div className="helper-line">Filtering by <strong>Employee ID</strong> only.</div>

          {/* ===== Row 2: Title + Add button (same line) ===== */}
          <div className="title-row">
            <h2 className="inline-title">Payroll Attendance</h2>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              + Add Attendance Record
            </button>
          </div>

          {/* divider under the title row */}
          <div className="section-divider" />

          {addOpen && (
            <div style={{ marginTop: 10 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee</label>
                  <select
                    value={form.empId}
                    onChange={(e) => setForm((s) => ({ ...s, empId: e.target.value }))}
                    disabled={empLoading}
                  >
                    <option value="">
                      {empLoading ? "Loading employees…" : "Select Employee"}
                    </option>
                    {!empLoading &&
                      employees.map((e) => (
                        <option key={e.EmpId} value={e.EmpId}>
                          {e.EmpId} - {e.Emp_Name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Period</label>
                  <input
                    type="month"
                    value={form.period}
                    onChange={(e) => setForm((s) => ({ ...s, period: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Working Days</label>
                  <input
                    type="number" min={0} max={31}
                    value={form.workingDays}
                    onChange={onAddNum("workingDays")}
                  />
                </div>
                <div className="form-group">
                  <label>Overtime Hours</label>
                  <input
                    type="number"
                    value={form.overtimeHrs}
                    onChange={(e) => setForm((s) => ({ ...s, overtimeHrs: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Leave Allowed</label>
                  <input
                    type="number" min={0} max={31}
                    value={form.leaveAllowed}
                    onChange={onAddNum("leaveAllowed")}
                  />
                </div>
                <div className="form-group">
                  <label>No Pay Leave</label>
                  <input
                    type="number" min={0} max={31}
                    value={form.noPayLeave}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Leave Taken</label>
                  <input
                    type="number" min={0} max={31}
                    value={form.leaveTaken}
                    onChange={onAddNum("leaveTaken")}
                  />
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-success" onClick={create} disabled={empLoading}>
                  Save Attendance
                </button>
                <button className="btn btn-warning" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <table id="attendanceTable" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Working Days</th>
                <th>Overtime Hrs</th>
                <th>Leave Allowed</th>
                <th>No Pay Leave</th>
                <th>Leave Taken</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Loading…</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan="8">{q ? "No matches for that Employee ID." : "No attendance yet"}</td></tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.employeeName ? `${r.empId} - ${r.employeeName}` : r.empId}</td>
                    <td>{r.period}</td>
                    <td>{r.workingDays ?? 0}</td>
                    <td>{r.overtimeHrs ?? 0}</td>
                    <td>{r.leaveAllowed ?? 0}</td>
                    <td>{r.noPayLeave ?? 0}</td>
                    <td>{r.leaveTaken ?? 0}</td>
                    <td className="actions">
                      <button className="btn btn-warning" onClick={() => setEditing(r)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(r._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="att-modal"
          onClick={(e) => { if (e.currentTarget === e.target) setEditing(null); }}
        >
          <div className="att-modal-content">
            <button className="att-modal-close" onClick={() => setEditing(null)}>×</button>
            <h2>Edit Attendance</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Employee</label>
                <select
                  value={editing.empId || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, empId: e.target.value }))}
                  disabled={empLoading}
                >
                  <option value="">
                    {empLoading ? "Loading employees…" : "Select Employee"}
                  </option>
                  {!empLoading && employees.map((e) => (
                    <option key={e.EmpId} value={e.EmpId}>{e.EmpId} - {e.Emp_Name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Period</label>
                <input
                  type="month"
                  value={editing.period || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, period: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Working Days</label>
                <input
                  type="number" min={0} max={31}
                  value={editing.workingDays === 0 ? 0 : (editing.workingDays ?? "")}
                  onChange={onEditNum("workingDays")}
                />
              </div>
              <div className="form-group">
                <label>Overtime Hours</label>
                <input
                  type="number"
                  value={editing.overtimeHrs === 0 ? 0 : (editing.overtimeHrs ?? "")}
                  onChange={(e) => setEditing((s) => ({ ...s, overtimeHrs: e.target.value === "" ? "" : e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Leave Allowed</label>
                <input
                  type="number" min={0} max={31}
                  value={editing.leaveAllowed === 0 ? 0 : (editing.leaveAllowed ?? "")}
                  onChange={onEditNum("leaveAllowed")}
                />
              </div>
              <div className="form-group">
                <label>No Pay Leave</label>
                <input
                  type="number" min={0} max={31}
                  value={editing.noPayLeave === 0 ? 0 : (editing.noPayLeave ?? "")}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Leave Taken</label>
                <input
                  type="number" min={0} max={31}
                  value={editing.leaveTaken === 0 ? 0 : (editing.leaveTaken ?? "")}
                  onChange={onEditNum("leaveTaken")}
                />
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-success" onClick={saveEdit} disabled={empLoading}>Save Changes</button>
              <button className="btn btn-warning" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
