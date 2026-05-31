// src/Components/Sidebar/Sidebarhiru.js
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Sidebarhiru.css";

export default function Sidebarhiru({
  initialActive = "dashboard",
  onNavigate,
  onLogout,
}) {
  const [active, setActive] = useState(initialActive);
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  /* ---------------- Restore last page (once) ---------------- */
  useEffect(() => {
    try {
      const last = localStorage.getItem("producthub:lastPage");
      if (last) setActive(last);
    } catch {}
  }, []);

  /* ---------------- Keep active in sync with route ---------------- */
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const map = {
      "/hirudashboard": "dashboard",
      "/sewing": "sewing",
      "/quality": "quality",
      "/employee": "employee",
      "/reportshiru": "reports",
      "/hiruinventory": "HiruInventory",
      "/settinghiru": "settings",
      "/login": "login",
    };
    const key = map[path];
    if (key) setActive(key);
  }, [location.pathname]);

  /* ---------------- Close on outside click (mobile) ---------------- */
  useEffect(() => {
    const handleDocClick = (e) => {
      if (window.innerWidth <= 1024) {
        const btn = document.querySelector(".sbx .mobile-menu");
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

  /* ---------------- Close with ESC (mobile) ---------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && window.innerWidth <= 1024) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- Titles (for notifications) ---------------- */
  const titleMap = {
    dashboard: "Dashboard",
    sewing: "Sewing Instruction",
    quality: "Quality Check",
    employee: "Employee",
    reports: "Reports",
    hiruinventory: "Hiru Inventory",
    settings: "Settings",
    login: "Login",
  };

  /* ---------------- Navigation helper ---------------- */
  const handleNavigate = (key) => {
    setActive(key);
    try {
      localStorage.setItem("producthub:lastPage", key);
    } catch {}
    if (window.showNotification) {
      window.showNotification(`Opening ${titleMap[key] || "Feature"}...`, "info");
    }
    onNavigate?.(key);
    if (window.innerWidth <= 1024) setOpen(false);
  };

  /* ---------------- Logout ---------------- */
  const logout = () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;
    if (window.showNotification) window.showNotification("Logging out...", "info");
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {}

    setTimeout(() => {
      alert("You have been logged out successfully!");
      onLogout?.();
      navigate("/login", { replace: true });
    }, 400);
  };

  return (
    <div className="sbx">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="mobile-menu"
        aria-label="Toggle menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      <aside
        ref={sidebarRef}
        className={`sidebar ${open ? "active" : ""}`}
        aria-label="Sidebar navigation"
      >
        <div className="sidebar-header">
          <h2>🛍️ PackPal</h2>
          <p>Product Dashboard Portal</p>
        </div>

        <nav className="sidebar-nav" role="navigation">
          <NavLink
            to="/hirudashboard"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "dashboard" ? "active" : ""}`
            }
            onClick={() => handleNavigate("dashboard")}
          >
            <i className="fa-solid fa-chart-line" /> <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/sewing"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "sewing" ? "active" : ""}`
            }
            onClick={() => handleNavigate("sewing")}
          >
            <i className="fa-solid fa-scissors" /> <span>Sewing Instruction</span>
          </NavLink>

          <NavLink
            to="/quality"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "quality" ? "active" : ""}`
            }
            onClick={() => handleNavigate("quality")}
          >
            <i className="fa-solid fa-shield-halved" /> <span>Quality Check</span>
          </NavLink>

          <NavLink
            to="/employee"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "employee" ? "active" : ""}`
            }
            onClick={() => handleNavigate("employee")}
          >
            <i className="fa-solid fa-users" /> <span>Employee</span>
          </NavLink>

           <NavLink
                 to="/hiruinventory"
                className={({ isActive }) =>
                   `nav-item ${isActive || active === "HiruInventory" ? "active" : ""}`
                }
                    onClick={() => handleNavigate("HiruInventory")}
                  >
                    <i className="fa-solid fa-boxes-stacked" /> <span> Inventory</span>
            </NavLink>

          <NavLink
            to="/reportshiru"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "reports" ? "active" : ""}`
            }
            onClick={() => handleNavigate("reports")}
          >
            <i className="fa-solid fa-file-lines" /> <span>Reports</span>
          </NavLink>

         

          <div className="nav-divider" />

          <NavLink
            to="/settinghiru"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "settings" ? "active" : ""}`
            }
            onClick={() => handleNavigate("settings")}
          >
            <i className="fa-solid fa-gear" /> <span>Setting</span>
          </NavLink>

          
        </nav>

        <div className="logout-section">
          <button className="logout-btn" type="button" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket" /> <span>Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
