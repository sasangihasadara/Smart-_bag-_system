import React, { useEffect, useRef, useState } from "react";
import "./Sidebarpul.css";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar({ initialActive = "reports", onNavigate, onLogout }) {
  const [active, setActive] = useState(initialActive);
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  // Restore last page
  useEffect(() => {
    try {
      const last = localStorage.getItem("financehub:lastPage");
      if (last) setActive(last);
    } catch {}
  }, []);

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

  const titleMap = {
    dashboard: "Dashboard",
    itemInventory: "Item Inventory",
    productInventory: "Product Inventory",
    purchase: "Purchase Items",
    suppliers: "Suppliers",
    reports: "Report & Analytics",
    settings: "Settings",
  };

  const handleNavigate = (key) => {
    setActive(key);
    try { localStorage.setItem("financehub:lastPage", key); } catch {}
    if (window.showNotification) {
      window.showNotification(`Opening ${titleMap[key] || "Feature"}...`, "info");
    }
    onNavigate?.(key);
  };

  const logout = () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;

    // optional: clear auth
    try { localStorage.removeItem("token"); sessionStorage.removeItem("token"); } catch {}

    if (window.showNotification) window.showNotification("Logging out...", "info");
    setTimeout(() => {
      alert("You have been logged out successfully!");
      onLogout?.();
      navigate("/login", { replace: true }); // ✅ redirect to /login
    }, 400);
  };

  return (
    <aside ref={sidebarRef} id="sidebar" className={`sidebar ${open ? "active" : ""}`}>
      <div className="sidebar-header">
        <h2>📦 PackPal</h2>
        <p>Inventory Management System</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/maindashboard"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "dashboard" ? "active" : ""}`
          }
          onClick={() => handleNavigate("dashboard")}
        >
          <i className="fas fa-chart-line" /> <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/iteminventory"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "itemInventory" ? "active" : ""}`
          }
          onClick={() => handleNavigate("itemInventory")}
        >
          <i className="fa-solid fa-boxes-stacked" /> <span>Item Inventory</span>
        </NavLink>

        <NavLink
          to="/productinventory"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "productInventory" ? "active" : ""}`
          }
          onClick={() => handleNavigate("productInventory")}
        >
          <i className="fa-solid fa-box-open" /> <span>Product Inventory</span>
        </NavLink>

        <NavLink
          to="/purchase"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "purchase" ? "active" : ""}`
          }
          onClick={() => handleNavigate("purchase")}
        >
          <i className="fa-solid fa-cart-shopping" /> <span>Purchase Items</span>
        </NavLink>

        <NavLink
          to="/supplier"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "suppliers" ? "active" : ""}`
          }
          onClick={() => handleNavigate("suppliers")}
        >
          <i className="fa-solid fa-truck" /> <span>Suppliers</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "reports" ? "active" : ""}`
          }
          onClick={() => handleNavigate("reports")}
        >
          <i className="fa-solid fa-chart-line" /> <span>Report &amp; Analytics</span>
        </NavLink>

        <div className="nav-divider" />

        <NavLink
          to="/settingspul"
          className={({ isActive }) =>
            `nav-item ${isActive || active === "settings" ? "active" : ""}`
          }
          onClick={() => handleNavigate("settings")}
        >
          <i className="fa-solid fa-gear" /> <span>Settings</span>
        </NavLink>
      </nav>

      <div className="logout-section">
        <button className="logout-btn" type="button" onClick={logout}>
          <i className="fa-solid fa-right-from-bracket" /> <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
