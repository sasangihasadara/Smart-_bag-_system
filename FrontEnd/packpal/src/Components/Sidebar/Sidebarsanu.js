// src/Components/Sidebar/Sidebarsanu.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebarsanu.css";

export default function Sidebar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click (mobile)
  useEffect(() => {
    const handleDocClick = (e) => {
      if (window.innerWidth <= 768) {
        const btn = document.querySelector(".mobile-menu");
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(e.target) &&
          (!btn || !btn.contains(e.target))
        ) {
          setOpen(false);
        }
      }
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const logout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    // (Optional) clear any stored auth
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {}

    onLogout?.(); // keep your existing callback if any
    navigate("/login", { replace: true }); // ✅ redirect to /login
  };

  return (
    <div className="sidebarsanu">
      <aside
        ref={sidebarRef}
        id="sidebar"
        className={`sidebar ${open ? "active" : ""}`}
      >
        <div className="sidebar-header">
          <h2>💰 PackPal</h2>
          <p>Finance Dashboard Portal</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/sanudashboard"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-chart-line" /> Dashboard
          </NavLink>

          <NavLink
            to="/salarycal"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-calculator" /> Employee Salary
          </NavLink>

          <NavLink
            to="/epf"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-piggy-bank" /> EPF/ETF Management
          </NavLink>

          <NavLink
            to="/financereport"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-file-alt" /> Financial Reports
          </NavLink>

          <NavLink
            to="/revenue"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-chart-bar" /> Revenue & Sales
          </NavLink>

          <div className="nav-divider" />

          <NavLink
            to="/settingsanu"
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-cog" /> Settings
          </NavLink>
        </nav>

        <div className="logout-section">
          <button className="logout-btn" type="button" onClick={logout}>
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
