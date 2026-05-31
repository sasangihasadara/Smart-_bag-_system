import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";             // public header (Login/Register)
import LogoutHeader from "./LogoutHeader"; // customer header (Logout)

function readAuth() {
  try {
    const token = localStorage.getItem("pp:token");
    const raw = localStorage.getItem("pp:user");
    const user = raw ? JSON.parse(raw) : null;
    const role = String(user?.role || "").trim().toLowerCase();
    return { token, user, role, isCustomer: !!token && role === "customer" };
  } catch {
    return { token: null, user: null, role: "", isCustomer: false };
  }
}

/** Storefront pages where a header is allowed */
const STOREFRONT_ALLOW_LIST = [
  "/home",
  "/handbag",
  "/accessories",
  "/clutches",
  "/kidsbag",
  "/totebag",
  "/sizeguide",
  "/sale",
  "/faq",
  "/aboutpage",
  "/feedback",
  
  
];

/** Routes where we must NEVER show any header (dashboards) */
// Not strictly needed because we’re whitelisting above, but keep for clarity
const DASHBOARD_PREFIXES = [
  "/maindashboard",
  "/isudashboard",
  "/hirudashboard",
  "/sanudashboard",
  "/dashboard",            // cart dashboard
  "/iteminventory",
  "/supplier",
  "/purchase",
  "/productinventory",
  "/report",
  "/settingspul",
  "/products",
  "/discounts",
  "/finance",
  "/reports",
  "/settingssa",
  "/usermanagement",
  "/order",
  "/settingsis",
  "/salarycal",
  "/epf",
  "/financereport",
  "/revenue",
  "/settingsanu",
  "/finance/employees",
  "/finance/attendance",
  "/finance/advance",
  "/finance/transfers",
  "/finance/salary",
  "/sewing",
  "/employee",
  "/reportshiru",
  "/hiruinventory",
  "/quality",
  "/settinghiru",
];

export default function AuthHeaderSwitcher() {
  const loc = useLocation();
  const [isCustomer, setIsCustomer] = useState(() => readAuth().isCustomer);
  const [isAuthed, setIsAuthed] = useState(() => !!readAuth().token);

  // Should header show on this path at all?
  const showHeaderOnThisPage = useMemo(() => {
    const path = loc.pathname.toLowerCase();

    // No header on auth pages
    if (path === "/login" || path === "/createaccount") return false;

    // If it's a dashboard route → never show a header
    if (DASHBOARD_PREFIXES.some(p => path.startsWith(p.toLowerCase()))) {
      return false;
    }

    // Only show header on storefront allow-list
    return STOREFRONT_ALLOW_LIST.some(p => path.startsWith(p.toLowerCase()));
  }, [loc.pathname]);

  useEffect(() => {
    const update = () => {
      const a = readAuth();
      setIsCustomer(a.isCustomer);
      setIsAuthed(!!a.token);
    };
    // same-tab login/logout
    window.addEventListener("pp:auth:changed", update);
    // cross-tab login/logout
    window.addEventListener("storage", update);
    // also re-check on each route change
    update();
    return () => {
      window.removeEventListener("pp:auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, [loc.pathname]);

  if (!showHeaderOnThisPage) return null;

  // Only customers get LogoutHeader.
  // Not logged in → public Header.
  // (If a staff/admin opens storefront pages, they’ll see the public Header as requested.)
  return isAuthed && isCustomer ? <LogoutHeader /> : <Header />;
}
