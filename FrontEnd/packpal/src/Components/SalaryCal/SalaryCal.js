import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SalaryCal.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { NavLink } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { api } from "../../lib/api";

const rs = (n) => `Rs. ${Math.round(Number(n || 0)).toLocaleString()}`;
const toast = (msg, type = "info") =>
  alert(`${(type?.toUpperCase?.() || String(type)).toUpperCase()}: ${msg}`);

// --- Sanitizers / Validators ---
const sanitizeLettersOnly = (v) =>
  String(v || "")
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeLettersOnlyLive = (v) =>
  String(v || "")
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s{2,}/g, " ");

const isLettersOnly = (v) => {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(s);
};

const sanitizeDigitsOnly = (v) => String(v || "").replace(/\D/g, "");
const isDigitsOnly = (v) => /^[0-9]+$/.test(String(v || ""));

const blockExpKeys = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

// Fixed list of designations
const DESIGNATION_OPTIONS = [
  "Finance Manager",
  "Inventory Manager",
  "Cart Manager",
  "User Manager",
  "Product Manager",
];

// utils
const norm = (s) => String(s ?? "").toLowerCase();

export default function SalaryCal() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    EmpId: "",
    Emp_Name: "",
    Designation: "",
    Epf_No: "",
    Base_Sal: "",
    Bank_Name: "",
    branch: "",
    Acc_No: "",
  });
  const [editing, setEditing] = useState(null);

  // Search (EmpId only)
  const [q, setQ] = useState("");
  const searchRef = useRef(null);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get("/finances");
      const list = (data.finances || []).slice().sort((a, b) => {
        const ta = a.createdAt
          ? new Date(a.createdAt).getTime()
          : parseInt(a._id.substring(0, 8), 16) * 1000;
        const tb = b.createdAt
          ? new Date(b.createdAt).getTime()
          : parseInt(b._id.substring(0, 8), 16) * 1000;
        return ta - tb;
      });
      setRows(list);
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onSlash = (e) => {
      // only handle plain "/" presses
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;

      // allow typing "/" inside the EPF fields only
      const t = e.target;
      const isEPFField = t && (t.id === "epfAdd" || t.id === "epfEdit");
      if (isEPFField) return; // do NOT preventDefault; let "/" be typed

      // otherwise: act as the shortcut
      e.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  // Create
  async function create() {
    if (!form.EmpId || !form.Emp_Name || !form.Base_Sal)
      return toast("EmpId, Name, Salary required", "warning");

    if (!isLettersOnly(form.Emp_Name))
      return toast("Name: letters only (A–Z), no numbers/symbols.", "warning");

    if (form.Designation && !isLettersOnly(form.Designation))
      return toast("Designation: letters only (A–Z).", "warning");

    if (form.Bank_Name && !isLettersOnly(form.Bank_Name))
      return toast("Bank Name: letters only (A–Z), no numbers/symbols.", "warning");
    if (form.branch && !isLettersOnly(form.branch))
      return toast("Branch: letters only (A–Z), no numbers/symbols.", "warning");

    if (form.Acc_No && !isDigitsOnly(form.Acc_No))
      return toast("Account No: digits only.", "warning");

    try {
      const payload = {
        ...form,
        Emp_Name: sanitizeLettersOnly(form.Emp_Name),
        Designation: sanitizeLettersOnly(form.Designation),
        Bank_Name: sanitizeLettersOnly(form.Bank_Name),
        branch: sanitizeLettersOnly(form.branch),
        Acc_No: sanitizeDigitsOnly(form.Acc_No),
        Base_Sal: Number(String(form.Base_Sal).replace(/[^\d.]/g, "")) || 0,
      };
      const { data } = await api.post("/finances", payload);
      setRows((p) => [...p, data]);
      setForm({
        EmpId: "",
        Emp_Name: "",
        Designation: "",
        Epf_No: "",
        Base_Sal: "",
        Bank_Name: "",
        branch: "",
        Acc_No: "",
      });
      setAddOpen(false);
      toast("Employee added", "success");
    } catch (e) {
      toast(e?.response?.data?.message || "Add failed", "error");
    }
  }

  // Save Edit
  async function saveEdit() {
    const id = editing?._id;
    if (!id) return toast("Update failed: missing _id", "error");

    if (!editing.EmpId || !editing.Emp_Name || editing.Base_Sal === "")
      return toast("EmpId, Name, Salary required", "warning");

    if (!isLettersOnly(editing.Emp_Name))
      return toast("Name: letters only (A–Z), no numbers/symbols.", "warning");
    if (editing.Designation && !isLettersOnly(editing.Designation))
      return toast("Designation: letters only (A–Z), no numbers/symbols.", "warning");
    if (editing.Bank_Name && !isLettersOnly(editing.Bank_Name))
      return toast("Bank Name: letters only (A–Z), no numbers/symbols.", "warning");
    if (editing.branch && !isLettersOnly(editing.branch))
      return toast("Branch: letters only (A–Z), no numbers/symbols.", "warning");

    if (editing.Acc_No && !isDigitsOnly(editing.Acc_No))
      return toast("Account No: digits only.", "warning");

    const payload = {
      EmpId: editing.EmpId,
      Emp_Name: sanitizeLettersOnly(editing.Emp_Name),
      Designation: sanitizeLettersOnly(editing.Designation),
      Epf_No: editing.Epf_No, // keep slashes if user typed them
      Base_Sal:
        editing.Base_Sal === ""
          ? ""
          : Number(String(editing.Base_Sal).replace(/[^\d.]/g, "")) || 0,
      Bank_Name: sanitizeLettersOnly(editing.Bank_Name),
      branch: sanitizeLettersOnly(editing.branch),
      Acc_No: sanitizeDigitsOnly(editing.Acc_No),
    };

    try {
      const { data } = await api.put(`/finances/${id}`, payload);
      setRows((prev) => prev.map((r) => (r._id === id ? data : r)));
      setEditing(null);
      toast("Updated", "success");
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Update failed";
      toast(`Update failed: ${msg}`, "error");
    }
  }

  // Delete
  async function remove(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api.delete(`/finances/${id}`);
      setRows((p) => p.filter((r) => r._id !== id));
      toast("Deleted", "warning");
    } catch (e) {
      toast(e?.response?.data?.message || "Delete failed", "error");
    }
  }

  // On-change handlers
  const handleAddChange = (k, val) => {
    let v = val;
    if (k === "Emp_Name" || k === "Designation" || k === "Bank_Name" || k === "branch") {
      v = sanitizeLettersOnlyLive(v);
    }
    if (k === "Acc_No") v = sanitizeDigitsOnly(v);
    if (k === "Base_Sal") v = String(v).replace(/[^\d.]/g, "");
    setForm((s) => ({ ...s, [k]: v }));
  };

  const handleEditChange = (k, val) => {
    let v = val;
    if (k === "Emp_Name" || k === "Designation" || k === "Bank_Name" || k === "branch") {
      v = sanitizeLettersOnlyLive(v);
    }
    if (k === "Acc_No") v = sanitizeDigitsOnly(v);
    if (k === "Base_Sal") v = String(v).replace(/[^\d.]/g, "");
    setEditing((s) => ({ ...s, [k]: v }));
  };

  /* ====== Filter by EmpId only ====== */
  const filteredRows = useMemo(() => {
    const query = norm(q);
    if (!query) return rows;
    return rows.filter((r) => norm(r.EmpId).includes(query));
  }, [rows, q]);

  const showing = filteredRows.length;
  const total = rows.length;

  return (
    <div className="salarycal page-wrap">
      <Sidebar />
      <div className="container">
        <h1>Employee Salary Management</h1>
        <p>Real-time salary insights and employee payroll management</p>

        <div className="section">
          <div className="nav">
            <NavLink to="/finance/employees" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
              👥 Employees
            </NavLink>
            <NavLink to="/finance/attendance" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
              📅 Attendance
            </NavLink>
            <NavLink to="/finance/advance" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
              💰 Advance
            </NavLink>
            <NavLink to="/finance/salary" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
              📊 Salary Management
            </NavLink>
            <NavLink to="/finance/transfers" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
              💸 Salary Transfers
            </NavLink>
          </div>

          {/* ======= PRETTY SEARCH (above) ======= */}
          <div className="pretty-search" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, marginBottom: 6, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 360px",
                maxWidth: 560,
                background: "linear-gradient(180deg, #ffffff, #fafafa)",
                border: "1px solid #e6e6e6",
                borderRadius: 12,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                padding: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
                title="Filter field"
              >
                Emp ID
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <i
                  className="fa fa-hashtag"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.6, fontSize: 14 }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Type an Employee ID (Hint: press / to focus)"
                  aria-label="Search by Employee ID"
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 28px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    outline: "none",
                    fontSize: 14,
                    background: "white",
                  }}
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    aria-label="Clear search"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      fontSize: 18,
                      cursor: "pointer",
                      lineHeight: 1,
                      opacity: 0.7,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <div
                style={{ padding: "6px 10px", borderRadius: 999, background: "#F3F4F6", fontSize: 12, color: "#111827" }}
                title="Matches"
              >
                {loading ? "…" : `${showing}/${total}`}
              </div>
            </div>
          </div>

          {/* helper line — fixed camelCase style key */}
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
            Filtering by <strong>Employee ID</strong> only.
          </div>

          {/* ===== Title + Button on the SAME line ===== */}
          <div className="section-header">
            <h2>Employee Information</h2>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              + Add Employee Details
            </button>
          </div>
          <div className="section-divider" />

          {addOpen && (
            <div style={{ marginTop: 10 }}>
              {/* Ordered fields: EmpId, Name, Designation, Epf_No, Base_Sal, Bank_Name, branch, Acc_No */}
              <div className="form-grid two-col">
                {/* 1. EmpId */}
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={form.EmpId}
                    onChange={(e) => handleAddChange("EmpId", e.target.value)}
                  />
                </div>

                {/* 2. Name */}
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={form.Emp_Name}
                    onChange={(e) => handleAddChange("Emp_Name", e.target.value)}
                    pattern="[A-Za-z ]+"
                    inputMode="text"
                  />
                </div>

                {/* 3. Designation */}
                <div className="form-group">
                  <label>Designation</label>
                  <select
                    value={form.Designation}
                    onChange={(e) => handleAddChange("Designation", e.target.value)}
                  >
                    <option value="">-- Select designation --</option>
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. EPF No (allow slashes) */}
                <div className="form-group">
                  <label>EPF No</label>
                  <input
                    id="epfAdd"
                    type="text"
                    value={form.Epf_No}
                    onChange={(e) => handleAddChange("Epf_No", e.target.value)}
                  />
                </div>

                {/* 5. Basic Salary */}
                <div className="form-group">
                  <label>Basic Salary</label>
                  <input
                    type="number"
                    value={form.Base_Sal}
                    onChange={(e) => handleAddChange("Base_Sal", e.target.value)}
                    inputMode="decimal"
                    step="0.01"
                    onKeyDown={blockExpKeys}
                  />
                </div>

                {/* 6. Bank Name */}
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={form.Bank_Name}
                    onChange={(e) => handleAddChange("Bank_Name", e.target.value)}
                    pattern="[A-Za-z ]+"
                    inputMode="text"
                  />
                </div>

                {/* 7. Branch */}
                <div className="form-group">
                  <label>Branch</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => handleAddChange("branch", e.target.value)}
                    pattern="[A-Za-z ]+"
                    inputMode="text"
                  />
                </div>

                {/* 8. Account No */}
                <div className="form-group">
                  <label>Account No</label>
                  <input
                    type="text"
                    value={form.Acc_No}
                    onChange={(e) => handleAddChange("Acc_No", e.target.value)}
                    inputMode="decimal"
                    onKeyDown={blockExpKeys}
                  />
                </div>
              </div>

              <button className="btn btn-success" onClick={create}>
                Save Employee
              </button>
              <button className="btn btn-warning" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
            </div>
          )}

          <table id="employeeTable" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>EPF No</th>
                <th>Basic Salary</th>
                <th>Bank Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading…</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    {q ? "No matches for that Employee ID." : "No employees yet"}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span
                        style={{
                          background: q && norm(r.EmpId).includes(norm(q)) ? "#FEF3C7" : "transparent",
                          borderRadius: 6,
                          padding: "2px 6px",
                        }}
                      >
                        {r.EmpId}
                      </span>
                    </td>
                    <td>{r.Emp_Name}</td>
                    <td>{r.Designation || ""}</td>
                    <td>{r.Epf_No || ""}</td>
                    <td>{rs(r.Base_Sal)}</td>
                    <td>{[r.Bank_Name, r.branch, r.Acc_No].filter(Boolean).join(" - ")}</td>
                    <td className="actions">
                      <button
                        className="btn btn-warning"
                        onClick={() => setEditing(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => remove(r._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          className="salary-modal open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.currentTarget === e.target) setEditing(null);
          }}
        >
          <div className="salary-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Employee</h3>
              <button
                className="salary-modal-close"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid two-col">
                {/* 1. EmpId */}
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={editing?.EmpId ?? ""}
                    onChange={(e) => handleEditChange("EmpId", e.target.value)}
                  />
                </div>

                {/* 2. Name */}
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editing?.Emp_Name ?? ""}
                    onChange={(e) => handleEditChange("Emp_Name", e.target.value)}
                    pattern="[A-Za-z ]+"
                    inputMode="text"
                  />
                </div>

                {/* 3. Designation */}
                <div className="form-group">
                  <label>Designation</label>
                  <select
                    value={editing?.Designation ?? ""}
                    onChange={(e) => handleEditChange("Designation", e.target.value)}
                  >
                    <option value="">-- Select designation --</option>
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. EPF No (allow slashes) */}
                <div className="form-group">
                  <label>EPF No</label>
                  <input
                    id="epfEdit"
                    type="text"
                    value={editing?.Epf_No ?? ""}
                    onChange={(e) => handleEditChange("Epf_No", e.target.value)}
                  />
                </div>

                {/* 5. Basic Salary */}
                <div className="form-group">
                  <label>Basic Salary</label>
                  <input
                    type="number"
                    value={editing?.Base_Sal ?? ""}
                    onChange={(e) => handleEditChange("Base_Sal", e.target.value)}
                    inputMode="decimal"
                    step="0.01"
                    onKeyDown={blockExpKeys}
                  />
                </div>

                {/* 6. Bank Name */}
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={editing?.Bank_Name ?? ""}
                    onChange={(e) => handleEditChange("Bank_Name", e.target.value)}
                    pattern="[A-Za-z ]+"
                    inputMode="text"
                  />
                </div>

                {/* 7. Branch */}
                <div className="form-group">
                  <label>Branch</label>
                  <input
                    type="text"
                    value={editing?.branch ?? ""}
                    onChange={(e) => handleEditChange("branch", e.target.value)}
                    pattern="[A-Za-z ]+"
                  />
                </div>

                {/* 8. Account No */}
                <div className="form-group">
                  <label>Account No</label>
                  <input
                    type="text"
                    value={editing?.Acc_No ?? ""}
                    onChange={(e) => handleEditChange("Acc_No", e.target.value)}
                    inputMode="decimal"
                    onKeyDown={blockExpKeys}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-warning" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={saveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
