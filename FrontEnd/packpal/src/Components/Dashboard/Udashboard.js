// src/Components/Udashboard/Udashboard.js
import React, { useEffect, useRef, useState } from "react";
import "./Udashboard.css";
import Sidebar from "../Sidebar/Sidebaris";

/* ---------- config ---------- */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* ---------- tiny counter animation ---------- */
function animateTo(node, end) {
  if (!node) return;
  const start = Number(node.dataset.val || 0);
  const target = Number(end || 0);
  const dur = 800;
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const val = Math.round(start + (target - start) * p);
    node.textContent = Number(val).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
    else node.dataset.val = target;
  };
  requestAnimationFrame(tick);
}

export default function Udashboard() {
  const [loading, setLoading] = useState(true);
  const totalRef = useRef(null);
  const newRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/users`);
        const data = await res.json();

        if (!res.ok) throw new Error(data?.message || res.statusText);

        const users = Array.isArray(data.users) ? data.users : [];
        const today = new Date().toISOString().slice(0, 10);

        const statTotal = users.length;
        const statNew = users.filter((u) => (u.createdAt || "").slice(0, 10) === today).length;
        const statPending = users.filter((u) => String(u.status || "").toLowerCase() === "pending").length;

        if (!cancelled) {
          animateTo(totalRef.current, statTotal);
          animateTo(newRef.current, statNew);
          animateTo(pendingRef.current, statPending);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
        // fall back to zeros
        animateTo(totalRef.current, 0);
        animateTo(newRef.current, 0);
        animateTo(pendingRef.current, 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="udb">
      <Sidebar />

      <div className="wrap">
        <main className="main">
          <h1 className="title">Dashboard</h1>

          <section className="cards">
            <article className="stat">
              <p className="stat__label">Total Users</p>
              <div className="stat__value" ref={totalRef} data-val="0">
                0
              </div>
            </article>

            <article className="stat">
              <p className="stat__label">New Today</p>
              <div className="stat__value" ref={newRef} data-val="0">
                0
              </div>
            </article>

            <article className="stat">
              <p className="stat__label">Pending Approval</p>
              <div className="stat__value" ref={pendingRef} data-val="0">
                0
              </div>
            </article>

            <article className="banner">
              <span className="emoji">💡</span>
              <p>{loading ? "Loading stats…" : "Welcome! Use the sidebar to navigate to each section."}</p>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
