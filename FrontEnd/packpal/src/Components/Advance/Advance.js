import React, { useEffect, useState } from "react";
import "./Advance.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

const rs = (n) => `Rs. ${Math.round(Number(n || 0)).toLocaleString()}`;
const toast = (msg, type = "info") => alert(`${type.toUpperCase()}: ${msg}`);

export default function Advance() {
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  async function loadEmployees() {
    try {
      setEmpLoading(true);
      const { data } = await api.get("/finances/min-list");
      setEmployees(data.employees || []);
    } catch (e) {
      toast(e?.response?.data?.message || e.message || "Failed to load employee list", "error");
    } finally {
      setEmpLoading(false);
    }
  }

  async function loadAdvances() {
    try {
      setLoadingRows(true);
      const { data } = await api.get("/advance?includeEmployee=1");
      const mapped = (data.advances || []).map(a => ({
        _id: a._id,
        empId: a.empId,
        name: a.employeeName || "",
        col: a.costOfLiving || 0,
        med: a.medical || 0,
        conv: a.conveyance || 0,
        perf: a.bonus || 0,
        attend: a.attendance || 0,
      }));
      setRows(mapped);
    } catch (e) {
      toast(e?.response?.data?.message || e.message || "Failed to load advances", "error");
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadAdvances();
  }, []);

  // ✅ ONLY ONE VERSION – this actually creates the row
  async function addCalculatedRow() {
    if (!selectedEmpId) return toast("Select an employee first", "warning");
    try {
      const resp = await api.post("/advance/compute", { empId: selectedEmpId });
      console.log("compute/created:", resp.status, resp.data);
      await loadAdvances();
      setSelectedEmpId("");
      toast("Computed and saved", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Compute failed";
      if (e?.response?.status === 409) {
        toast(msg || "Advance for this employee and period already exists", "warning");
        await loadAdvances(); // show the existing row
      } else {
        toast(msg, "error");
      }
    }
  }

  async function removeRow(idOrEmpId) {
    const row = rows.find(r => r._id === idOrEmpId || r.empId === idOrEmpId);
    const _id = row?._id;
    if (!_id) return toast("Cannot delete: missing id", "error");
    if (!window.confirm("Delete this advance record?")) return;
    try {
      await api.delete(`/advance/${_id}`);
      await loadAdvances();
      toast("Deleted", "warning");
    } catch (e) {
      toast(e?.response?.data?.message || e.message || "Delete failed", "error");
    }
  }

  return (
    <div className="advance page-wrap">
      <Sidebar />
      <div className="container">
        <h1>Employee Salary Management</h1>
        <p>Real-time salary insights and employee payroll management</p>

        <div className="section">
          <div className="nav">
            <NavLink to="/finance/employees"  className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>👥 Employees</NavLink>
            <NavLink to="/finance/attendance" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>📅 Attendance</NavLink>
            <NavLink to="/finance/advance"    className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>💰 Advance</NavLink>
            <NavLink to="/finance/salary"     className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>📊 Salary Management</NavLink>
            <NavLink to="/finance/transfers"  className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>💸 Salary Transfers</NavLink>
          </div>

          <h2>Payroll Advance</h2>

          <div className="controls-bar">
            <div className="form-group">
              <label>Select Employee</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                disabled={empLoading}
              >
                <option value="">
                  {empLoading ? "Loading employees…" : "-- Select Employee --"}
                </option>
                {!empLoading &&
                  employees.map((e) => (
                    <option key={e.EmpId} value={e.EmpId}>
                      {e.EmpId} - {e.Emp_Name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              className="btn btn-primary calc-cta"
              onClick={addCalculatedRow}
              disabled={empLoading}
              title="Calculate and add row"
            >
              Calculate Allowances
            </button>
          </div>

          <div className="table-wrap pretty">
            <table id="advanceTable">
              <thead>
                <tr>
                  <th style={{width: "160px"}}>Employee</th>
                  <th>Name</th>
                  <th colSpan={3}>Allowances (Rs.)</th>
                  <th colSpan={2}>Bonuses (Rs.)</th>
                  <th style={{width: "160px"}}>Actions</th>
                </tr>
                <tr>
                  <th></th><th></th>
                  <th>Cost of Living (40%)</th>
                  <th>Medical (10%)</th>
                  <th>Conveyance (15%)</th>
                  <th>Performance (20%)</th>
                  <th>Attendance (5%)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr><td colSpan={8}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8}>No rows yet — select an employee and click “Calculate Allowances”.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r._id || r.empId}>
                      <td className="employee-id">{r.empId}</td>
                      <td className="employee-name">{r.name}</td>
                      <td className="allowance-col">{rs(r.col)}</td>
                      <td className="allowance-col">{rs(r.med)}</td>
                      <td className="allowance-col">{rs(r.conv)}</td>
                      <td className="bonus-col">{rs(r.perf)}</td>
                      <td className="bonus-col">{rs(r.attend)}</td>
                      <td className="actions">
                        <button className="btn btn-danger" onClick={() => removeRow(r._id || r.empId)}>
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
      </div>
    </div>
  );
}
