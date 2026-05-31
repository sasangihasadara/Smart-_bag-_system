// src/Components/Header/CustomerLogoutGate.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LogoutHeader from "./LogoutHeader";

function readAuth() {
  try {
    const token = localStorage.getItem("pp:token");
    const raw = localStorage.getItem("pp:user");
    const user = raw ? JSON.parse(raw) : null;

    const role = String(user?.role || "").trim().toLowerCase();

    const isCustomer =
      !!token &&
      !!user &&
      (role === "customer" || role === "customers"); // tolerant

    // DEBUG: log once each time we read
    console.debug("[CustomerLogoutGate] token?", !!token, "user?", user, "role:", role, "isCustomer:", isCustomer);

    return { token, user, role, isCustomer };
  } catch (e) {
    console.warn("[CustomerLogoutGate] readAuth error:", e);
    return { token: null, user: null, role: "", isCustomer: false };
  }
}

export default function CustomerLogoutGate() {
  const [show, setShow] = useState(() => readAuth().isCustomer);
  const loc = useLocation();

  useEffect(() => {
    const update = () => setShow(readAuth().isCustomer);

    // Update on:
    // 1) our custom event (same tab)
    // 2) storage (cross-tab)
    window.addEventListener("pp:auth:changed", update);
    window.addEventListener("storage", update);

    // Also update on route change (good for first paint after navigate)
    update();

    return () => {
      window.removeEventListener("pp:auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, [loc.pathname]);

  // Hide on auth pages
  if (loc.pathname === "/login" || loc.pathname === "/createaccount") return null;

  return show ? <LogoutHeader /> : null;
}
