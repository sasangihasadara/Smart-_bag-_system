// src/Components/UserManagement/UserManagement.js
import React, { useMemo, useState, useEffect } from "react";
import "./UserManagement.css";
import Sidebar from "../Sidebar/Sidebaris";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================
   API base
   ========================= */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const USERS_URL = `${API_BASE}/api/users`;

/* =========================
   Company / PDF header config
   ========================= */
const COMPANY = {
  name: "PackPal (Pvt) Ltd",
  address: "No. 42, Elm Street, Colombo",
  email: "hello@packpal.lk",
  // Use same-origin image path or a Base64 data URL for reliability
  logo: "/new logo.png",
};

// Draws the header on the current jsPDF page (we call this ONLY on page 1)
function drawHeader(doc, { title }) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 22;
  const rightX = pageW - 22;

  // Left: logo
  try {
    doc.addImage(COMPANY.logo, "PNG", marginX - 2, 14, 22, 22);
  } catch {}

  // Left: title + generated date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(String(title || "Report"), marginX + 26, 24);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, marginX + 26, 38);

  // Right block
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(COMPANY.name, rightX, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(COMPANY.address, rightX, 32, { align: "right" });

  doc.setTextColor(34, 87, 215);
  doc.textWithLink(COMPANY.email, rightX, 44, {
    align: "right",
    url: `mailto:${COMPANY.email}`,
  });

  // Divider
  doc.setDrawColor(220);
  doc.setLineWidth(0.6);
  doc.line(marginX, 52, rightX, 52);

  doc.setTextColor(0);
}

/* =========================
   Name helpers / validation
   ========================= */
const NAME_DISALLOWED_RE = /[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g;
const NAME_PATTERN = "^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}$";

function sanitizeName(value = "") {
  return value.replace(NAME_DISALLOWED_RE, "").replace(/\s{2,}/g, " ").trim();
}

function slugify(s = "") {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function genEmail(firstName, lastName, domain = "packpal.com") {
  const f = slugify(firstName);
  const l = slugify(lastName);
  if (!f && !l) return "";
  return `${f}.${l}@${domain}`.replace(/^\./, "").replace(/\.@/, "@");
}

function genPassword(first, last) {
  const base = `${first}${last}` || "PackPal";
  const lower = base.toLowerCase().slice(0, 3) || "abc";
  const upper = base.toUpperCase().slice(0, 2) || "PP";
  const num = Math.floor(1000 + Math.random() * 9000);
  const sym = "!@#$%^&*"[Math.floor(Math.random() * 8)];
  const pad = Math.random().toString(36).slice(2, 6);
  return `${upper}${lower}${num}${sym}${pad}`;
}

// Save only customers to localStorage for Orders page (optional)
function syncCustomersToLocalStorage(users = []) {
  try {
    const customers = users
      .filter((u) => String(u.role || "").toLowerCase() === "customer")
      .map((u) => ({
        _id: u._id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
        email: u.email || "",
        createdAt: u.createdAt || "",
        status: u.status || "active",
      }));
    localStorage.setItem("packpal_customers", JSON.stringify(customers));
  } catch (e) {
    console.warn("Could not write packpal_customers to localStorage:", e);
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Inventory Manager",
    password: "",
  });
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwdTouched, setPwdTouched] = useState(false);

  const isLocked = (u) => (u?.role || "").toLowerCase() === "customer";

  // Load users
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(USERS_URL, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!abort) {
          if (res.ok) setUsers(data.users || []);
          else console.error("Fetch users failed:", data?.message || res.statusText);
        }
      } catch (err) {
        if (!abort) console.error("Network error fetching users:", err);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  // Orders page mirror
  useEffect(() => {
    syncCustomersToLocalStorage(users);
  }, [users]);

  // Auto-generate email/password in Add modal
  useEffect(() => {
    if (!adding) return;
    const { firstName, lastName } = newUser;
    if (!emailTouched) {
      const email = genEmail(firstName, lastName);
      setNewUser((u) => ({ ...u, email }));
    }
    if (!pwdTouched) {
      const password = genPassword(firstName, lastName);
      setNewUser((u) => ({ ...u, password }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUser.firstName, newUser.lastName, adding, emailTouched, pwdTouched]);

  // filters / stats
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users.filter((u) => {
      const hay = (u.firstName + " " + u.lastName + " " + u.email).toLowerCase();
      const byText = !t || hay.includes(t);
      const byRole = role === "All" || (u.role || "").toLowerCase() === role.toLowerCase();
      return byText && byRole;
    });
  }, [users, q, role]);

  const today = new Date().toISOString().slice(0, 10);
  const statTotal = users.length;
  const statNew = users.filter((u) => String(u.createdAt || "").slice(0, 10) === today).length;
  const statPending = users.filter((u) => (u.status || "").toLowerCase() === "pending").length;

  // Pills
  function pill(status = "") {
    const s = (status || "").toLowerCase();
    const cls = s === "active" ? "active" : s === "pending" ? "pending" : "suspended";
    return <span className={`pill ${cls}`}>{status || "active"}</span>;
  }

  // Edit
  function openEdit(u) {
    if (!isLocked(u)) setEditing({ ...u });
  }
  function closeEdit() {
    setEditing(null);
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (isLocked(editing)) return;
    try {
      const res = await fetch(`${USERS_URL}/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editing),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user) {
        setUsers((prev) => prev.map((u) => (u._id === data.user._id ? data.user : u)));
        closeEdit();
      } else {
        alert("Update failed: " + (data?.message || res.statusText));
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  // Delete
  async function del(id) {
    const user = users.find((u) => u._id === id);
    if (isLocked(user)) return;
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`${USERS_URL}/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setUsers((prev) => prev.filter((u) => u._id !== id));
      else {
        const data = await res.json().catch(() => ({}));
        alert("Delete failed: " + (data?.message || res.statusText));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  // Add
  function openAdd() {
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      role: "Inventory Manager",
      password: "",
    });
    setEmailTouched(false);
    setPwdTouched(false);
    setAdding(true);
  }
  function closeAdd() {
    setAdding(false);
  }
  async function saveAdd(e) {
    e.preventDefault();
    try {
      const res = await fetch(USERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newUser),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user) {
        setUsers((prev) => [...prev, data.user]);
        closeAdd();
      } else {
        alert("Add failed: " + (data?.message || res.statusText));
      }
    } catch (err) {
      console.error("Add error:", err);
    }
  }

  // --- CSV export ---
  function exportCsv() {
    const columns = ["First Name", "Last Name", "Email", "Role", "Status", "Created"];
    const rows = filtered.map((u) => [
      u.firstName || "",
      u.lastName || "",
      u.email || "",
      u.role || "",
      u.status || "active",
      (u.createdAt || "").slice(0, 10),
    ]);

    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const csv =
      [columns.map(esc).join(",")]
        .concat(rows.map((r) => r.map(esc).join(",")))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- PDF export: header only on the first page ---
  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = "User Management Report";

    // draw header ONLY once (first page)
    drawHeader(doc, { title });

    const head = ["First Name", "Last Name", "Email", "Role", "Status", "Created"];
    const rows = filtered.map((u) => [
      u.firstName || "",
      u.lastName || "",
      u.email || "",
      u.role || "",
      u.status || "active",
      (u.createdAt || "").slice(0, 10),
    ]);

    autoTable(doc, {
      head: [head],
      body: rows,
      startY: 70,
      margin: { top: 24 },
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [25, 118, 210] },
      didDrawPage: (data) => {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
          pageW - 22,
          pageH - 16,
          { align: "right" }
        );
      },
    });

    doc.save("users.pdf");
  }

  return (
    <div className={`um-wrap ${adding || editing ? "has-modal" : ""}`}>
      <Sidebar />

      <main className="um-main">
        <h1 className="um-title">User Management</h1>

        <section className="um-stats">
          <article className="um-stat">
            <p className="um-stat__label">Total Users</p>
            <div className="um-stat__value">{users.length}</div>
          </article>
          <article className="um-stat">
            <p className="um-stat__label">New Today</p>
            <div className="um-stat__value">
              {users.filter((u) => String(u.createdAt || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
            </div>
          </article>
          <article className="um-stat">
            <p className="um-stat__label">Pending Approval</p>
            <div className="um-stat__value">
              {users.filter((u) => (u.status || "").toLowerCase() === "pending").length}
            </div>
          </article>
        </section>

        <section className="um-card">
          <header className="um-card__head">
            <h2 className="um-card__title">All Users</h2>
            <div className="um-tools">
              <input
                className="um-input"
                type="search"
                placeholder="Search users by name, email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select className="um-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="All">All Roles</option>
                <option value="Inventory Manager">Inventory Manager</option>
                <option value="Finance Manager">Finance Manager</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Cart Manager">Cart Manager</option>
                <option value="User Manager">User Manager</option>
                <option value="customer">Customer</option>
              </select>

              <button className="um-btn" onClick={exportCsv}>⬇ Export CSV</button>
              <button className="um-btn" onClick={exportPdf}>📄 Export PDF</button>
              <button className="um-btn primary" onClick={openAdd}>➕ Add Employee</button>
            </div>
          </header>

          {loading ? (
            <p>Loading users…</p>
          ) : (
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const locked = isLocked(u);
                    return (
                      <tr key={u._id}>
                        <td>{u.firstName}</td>
                        <td>{u.lastName}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{String(u.createdAt || "").slice(0, 10)}</td>
                        <td>{pill(u.status)}</td>
                        <td>
                          <button
                            className={`um-btn small ${locked ? "disabled" : ""}`}
                            onClick={() => !locked && openEdit(u)}
                            disabled={locked}
                          >
                            ✎ Edit
                          </button>
                          <button
                            className={`um-btn small danger ${locked ? "disabled" : ""}`}
                            onClick={() => !locked && del(u._id)}
                            disabled={locked}
                          >
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add Employee Modal */}
        {adding && (
          <div className="um-modal show" role="dialog" aria-modal="true" aria-labelledby="addTitle">
            <div className="um-modal__dialog">
              <header className="um-modal__head">
                <h3 id="addTitle">Add Employee</h3>
                <button className="um-iconbtn" onClick={closeAdd}>✕</button>
              </header>
              <form className="um-form" onSubmit={saveAdd}>
                <div className="um-field">
                  <label>First Name</label>
                  <input
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: sanitizeName(e.target.value) })
                    }
                    inputMode="text"
                    pattern={NAME_PATTERN}
                    title="Only letters, spaces, apostrophes, periods and hyphens. Minimum 2 characters."
                    required
                  />
                </div>
                <div className="um-field">
                  <label>Last Name</label>
                  <input
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: sanitizeName(e.target.value) })
                    }
                    inputMode="text"
                    pattern={NAME_PATTERN}
                    title="Only letters, spaces, apostrophes, periods and hyphens. Minimum 2 characters."
                    required
                  />
                </div>
                <div className="um-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => {
                      setNewUser({ ...newUser, email: e.target.value });
                      setEmailTouched(true);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    required
                  />
                </div>
                <div className="um-field">
                  <label>Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="Inventory Manager">Inventory Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Cart Manager">Cart Manager</option>
                    <option value="User Manager">User Manager</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div className="um-field">
                  <label>Password</label>
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => {
                      setNewUser({ ...newUser, password: e.target.value });
                      setPwdTouched(true);
                    }}
                    onBlur={() => setPwdTouched(true)}
                    required
                  />
                </div>
                <footer className="um-modal__foot">
                  <button type="button" className="um-btn ghost" onClick={closeAdd}>
                    Cancel
                  </button>
                  <button type="submit" className="um-btn primary">
                    Add
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="um-modal show" role="dialog" aria-modal="true" aria-labelledby="editTitle">
            <div className="um-modal__dialog">
              <header className="um-modal__head">
                <h3 id="editTitle">Edit User</h3>
                <button className="um-iconbtn" onClick={closeEdit}>✕</button>
              </header>
              <form className="um-form" onSubmit={saveEdit}>
                <div className="um-field">
                  <label>First Name</label>
                  <input
                    value={editing.firstName}
                    onChange={(e) =>
                      setEditing({ ...editing, firstName: sanitizeName(e.target.value) })
                    }
                    inputMode="text"
                    pattern={NAME_PATTERN}
                    title="Only letters, spaces, apostrophes, periods and hyphens. Minimum 2 characters."
                    required
                  />
                </div>
                <div className="um-field">
                  <label>Last Name</label>
                  <input
                    value={editing.lastName}
                    onChange={(e) =>
                      setEditing({ ...editing, lastName: sanitizeName(e.target.value) })
                    }
                    inputMode="text"
                    pattern={NAME_PATTERN}
                    title="Only letters, spaces, apostrophes, periods and hyphens. Minimum 2 characters."
                    required
                  />
                </div>
                <div className="um-field">
                  <label>Email</label>
                  <input type="email" value={editing.email} readOnly disabled title="Email cannot be changed" />
                </div>
                <div className="um-field">
                  <label>Role</label>
                  <select
                    value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                    disabled={isLocked(editing)}
                  >
                    <option value="Inventory Manager">Inventory Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Cart Manager">Cart Manager</option>
                    <option value="User Manager">User Manager</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div className="um-field">
                  <label>Status</label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    disabled={isLocked(editing)}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <footer className="um-modal__foot">
                  <button type="button" className="um-btn ghost" onClick={closeEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="um-btn primary" disabled={isLocked(editing)}>
                    Save
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
