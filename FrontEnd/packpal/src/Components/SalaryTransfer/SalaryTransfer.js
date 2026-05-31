// FrontEnd/src/Components/SalaryTransfer/SalaryTransfer.jsx
import React, { useEffect, useState } from "react";
import "./SalaryTransfer.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

const rs = (n) => `Rs. ${Math.round(Number(n || 0)).toLocaleString()}`;

export default function SalaryTransfer() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  function ts(doc) {
    if (doc?.createdAt) return new Date(doc.createdAt).getTime();
    if (doc?._id) return parseInt(String(doc._id).substring(0, 8), 16) * 1000;
    return 0;
  }

  async function loadTransfers() {
    try {
      setLoading(true);
      const { data } = await api.get("/transfers");
      const list = (data.transfers || [])
        .slice()
        .sort((a, b) => ts(a) - ts(b));
      setRows(list);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }

  async function markAsPaid(id) {
    try {
      await api.patch(`/transfers/${id}/pay`);
      await loadTransfers();
      alert("Salary transfer marked as paid!");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update");
    }
  }

  async function deleteTransfer(id) {
    if (!window.confirm("Delete this transfer record?")) return;
    try {
      await api.delete(`/transfers/${id}`);
      await loadTransfers();
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  }

  useEffect(() => { loadTransfers(); }, []);

  return (
    // ✅ Unique page wrapper prevents CSS collisions
    <div className="salary-transfer-page">
      <div className="salarycal page-wrap">
        <Sidebar />

        <div className="container">
          <h1>Employee Salary Management</h1>
          <p>Real-time salary insights and employee payroll management</p>

          <div className="section">
            <div className="nav">
              <NavLink to="/finance/employees"  className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>👥 Employees</NavLink>
              <NavLink to="/finance/attendance" className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>📅 Attendance</NavLink>
              <NavLink to="/finance/advance"    className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>💰 Advance</NavLink>
              <NavLink to="/finance/salary"     className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>📊 Salary Management</NavLink>
              <NavLink to="/finance/transfers"  className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>💸 Salary Transfers</NavLink>
            </div>

            <h2>Salary Transfer Details</h2>

            <table id="transferTable">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Date</th>
                  <th>Month</th>
                  <th>Employee Name</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7}>No transfers yet.</td></tr>
                ) : rows.map((t) => {
                  const paid = t.status === "Paid";
                  return (
                    <tr key={t._id}>
                      <td>{t.empId}</td>
                      <td>{t.date}</td>
                      <td>{t.month}</td>
                      <td>{t.empName || "-"}</td>
                      <td>{rs(t.amount)}</td>
                      <td>
                        <span className={`status-badge ${paid ? "status-paid" : "status-pending"}`}>
                          {paid ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="actions">
                        {paid ? (
                          <span>Completed</span>
                        ) : (
                          <button className="btn btn-success" onClick={() => markAsPaid(t._id)}>
                            Mark as Paid
                          </button>
                        )}
                        <button className="btn btn-danger" onClick={() => deleteTransfer(t._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
