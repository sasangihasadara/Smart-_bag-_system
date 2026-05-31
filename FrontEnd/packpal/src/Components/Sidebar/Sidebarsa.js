import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Sidebarsa.css";

export default function Sidebar({
  initialActive = "reports",
  onNavigate,
  onLogout, // optional callback
}) {
  const [active, setActive] = useState(initialActive);
  const location = useLocation();
  const navigate = useNavigate();

  // Restore last page once
  useEffect(() => {
    try {
      const last = localStorage.getItem("financehub:lastPage");
      if (last) setActive(last);
    } catch {}
  }, []);

  // Keep active state in sync with the URL
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const map = {
      "/dashboard": "dashboard",
      "/products": "products",
      "/discounts": "discounts",
      "/finance": "finance",
      "/reports": "reports",
      "/settingssa": "settings",
    };
    const key = map[path];
    if (key) setActive(key);
  }, [location.pathname]);

  const titleMap = {
    dashboard: "Dashboard",
    products: "Products List",
    discounts: "Discounts",
    finance: "Finance",
    reports: "Reports",
    settings: "Settings",
  };

  const handleNavigate = (key) => {
    setActive(key);
    try {
      localStorage.setItem("financehub:lastPage", key);
    } catch {}
    if (window.showNotification) {
      window.showNotification(`Opening ${titleMap[key] || "Feature"}...`, "info");
    }
    onNavigate?.(key);
  };

  const logout = () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;

    if (window.showNotification) {
      window.showNotification("Logging out...", "info");
    }
    try {
      localStorage.removeItem("financehub:lastPage");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {}

    setTimeout(() => {
      alert("You have been logged out successfully!");
      onLogout?.();                 // let parent clear auth if needed
      navigate("/login", { replace: true }); // ✅ redirect to /login
    }, 400);
  };

  return (
    <div className="sidebar">
      <h2 className="logo">Smart Bag System</h2>

      <ul className="nav-list">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "dashboard" ? "active" : ""}`
            }
            onClick={() => handleNavigate("dashboard")}
          >
            📊 Dashboard
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "products" ? "active" : ""}`
            }
            onClick={() => handleNavigate("products")}
          >
            🛒 Products List
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/discounts"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "discounts" ? "active" : ""}`
            }
            onClick={() => handleNavigate("discounts")}
          >
            💸 Discounts
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/finance"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "finance" ? "active" : ""}`
            }
            onClick={() => handleNavigate("finance")}
          >
            💰 Finance
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "reports" ? "active" : ""}`
            }
            onClick={() => handleNavigate("reports")}
          >
            📑 Reports
          </NavLink>
        </li>

        {/* Settings */}
        <li>
          <NavLink
            to="/settingssa"
            className={({ isActive }) =>
              `nav-item ${isActive || active === "settings" ? "active" : ""}`
            }
            onClick={() => handleNavigate("settings")}
          >
            ⚙️ Settings
          </NavLink>
        </li>
      </ul>

      <div className="nav-divider" />
      <div className="logout-section">
        <button type="button" className="logout-btn" onClick={logout}>
          🚪 <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
