import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SewingInstruction.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";
import { api } from "../../lib/api2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // function import

/* ------------------ Company info for the header (right block) ------------------ */
const COMPANY = {
  name: "PackPal (Pvt) Ltd",
  address: "No. 42, Elm Street, Colombo",
  email: "hello@packpal.lk",
};

/* ------------------ Helpers ------------------ */
// Normalize date for <input type="date"> and display
const toDateInput = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
};

// Only letters and spaces are allowed for Sewing Person (validation)
const PERSON_RE = /^[A-Za-z ]+$/;
const sanitizePerson = (v) => v.replace(/[^A-Za-z ]+/g, "").replace(/\s{2,}/g, " ");

// Load an image from /public and return a PNG data URL (for jsPDF.addImage)
const loadImageAsDataURL = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });

export default function SewingInstruction() {
  /* ---------- dialogs ---------- */
  const formRef = useRef(null);
  const viewRef = useRef(null);

  /* ---------- state ---------- */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const [form, setForm] = useState({
    bag: "",
    details: "",
    person: "",
    deadline: "",
    priority: "High",
    status: "In Progress",
  });

  const [personError, setPersonError] = useState("");
  const [logoData, setLogoData] = useState(null); // holds data URL for /public/logo.png

  // SEARCH (Bag Type prefix only)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [search]);

  // preload logo once
  useEffect(() => {
    loadImageAsDataURL("/logo.png")
      .then(setLogoData)
      .catch(() => setLogoData(null));
  }, []);

  /* ---------- open/close dialogs ---------- */
  useEffect(() => {
    if (!formRef.current) return;
    if (editing) formRef.current.showModal();
    else if (formRef.current.open) formRef.current.close();
  }, [editing]);

  useEffect(() => {
    if (!viewRef.current) return;
    if (viewItem) viewRef.current.showModal();
    else if (viewRef.current.open) viewRef.current.close();
  }, [viewItem]);

  /* ---------- load from server ---------- */
  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/sewing-instructions");
      const mapped = (data.items || []).map((i) => ({
        id: i._id,
        bag: i.bag,
        details: i.details || "",
        person: i.person,
        deadline: toDateInput(i.deadline),
        priority: i.priority,
        status: i.status,
        createdAt: i.createdAt,
      }));
      // Keep newest items at the end so refresh doesn't move the last row to the top
      const sorted = mapped.slice().sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return da - db; // ascending
      });
      setItems(sorted);
    } catch (e) {
      console.error(e);
      alert("Failed to load sewing instructions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // broadcast refresh hooks
  useEffect(() => {
    const onBcast = () => load();
    const onStorage = (e) => {
      if (e.key === "sewing:lastUpdate") load();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("sewing:changed", onBcast);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("sewing:changed", onBcast);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* ---------- helpers ---------- */
  const resetForm = () =>
    setForm({
      bag: "",
      details: "",
      person: "",
      deadline: "",
      priority: "High",
      status: "In Progress",
    });

  const openCreate = () => {
    resetForm();
    setPersonError("");
    setEditing({ id: null });
  };

  const openEdit = (row) => {
    setForm({
      bag: row.bag,
      details: row.details || "",
      person: row.person,
      deadline: row.deadline,
      priority: row.priority,
      status: row.status,
    });
    setPersonError("");
    setEditing({ id: row.id });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this instruction?")) return;
    try {
      await api.delete(`/api/sewing-instructions/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      window.dispatchEvent(new Event("sewing:changed"));
      localStorage.setItem("sewing:lastUpdate", String(Date.now()));
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  // General handler except for Sewing Person (custom rules)
  const handleChange = (e) => {
    const key = e.target.id.replace("f_", "");
    let value = e.target.value;

    if (key === "person") {
      value = sanitizePerson(value);
      if (value && !PERSON_RE.test(value)) {
        setPersonError("Letters and spaces only (no numbers or symbols).");
      } else {
        setPersonError("");
      }
    }

    setForm((f) => ({ ...f, [key]: value }));
  };

  // Block disallowed keys for Sewing Person while typing
  const handlePersonKeyDown = (e) => {
    const allowedControl = new Set([
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ]);
    const isLetterOrSpace = /^[A-Za-z ]$/.test(e.key);
    if (!isLetterOrSpace && !allowedControl.has(e.key)) {
      e.preventDefault();
    }
  };

  // Sanitize pasted content for Sewing Person
  const handlePersonPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const clean = sanitizePerson(text);
    document.execCommand("insertText", false, clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.bag || !form.person || !form.deadline) {
      alert("Bag, Person and Deadline are required");
      return;
    }
    if (!PERSON_RE.test(form.person)) {
      setPersonError("Letters and spaces only (no numbers or symbols).");
      alert("Sewing Person must contain letters and spaces only.");
      return;
    }

    const payload = {
      bag: form.bag,
      details: form.details || "",
      person: form.person.trim(),
      deadline: form.deadline, // "YYYY-MM-DD"
      priority: form.priority,
      status: form.status,
    };
    try {
      if (editing?.id) {
        const { data } = await api.put(
          `/api/sewing-instructions/${editing.id}`,
          payload
        );
        const u = data.after;
        setItems((prev) =>
          prev.map((x) =>
            x.id === editing.id
              ? {
                  id: u._id,
                  bag: u.bag,
                  details: u.details || "",
                  person: u.person,
                  deadline: toDateInput(u.deadline),
                  priority: u.priority,
                  status: u.status,
                  createdAt: u.createdAt,
                }
              : x
          )
        );
        window.dispatchEvent(new Event("sewing:changed"));
        localStorage.setItem("sewing:lastUpdate", String(Date.now()));
      } else {
        const { data } = await api.post("/api/sewing-instructions", payload);
        const c = data.item;
        const newItem = {
          id: c._id,
          bag: c.bag,
          details: c.details || "",
          person: c.person,
          deadline: toDateInput(c.deadline),
          priority: c.priority,
          status: c.status,
          createdAt: c.createdAt,
        };
        // Append to end
        setItems((prev) => [...prev, newItem]);
      }
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
  };

  /* ---------- Derived: filter by Bag Type prefix only ---------- */
  const filteredItems = useMemo(() => {
    const q = debouncedSearch;
    if (!q) return items;
    return items.filter((i) => (i.bag ?? "").toString().toLowerCase().startsWith(q));
  }, [items, debouncedSearch]);

  /* ---------- PDF export (branded header) ---------- */
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 40;

    // Header metrics
    const logoW = 45;
    const logoH = 45;
    const logoX = marginX;
    const logoY = 28;

    // --- HEADER ---
    // Left: logo
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", logoX, logoY, logoW, logoH);
      } catch {
        /* ignore if logo fails */
      }
    }

    // Left: title + generated datetime (beside logo)
    const textLeftX = logoX + logoW + 12;
    const titleY = logoY + 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(20);
    doc.text("Sewing Instruction Report", textLeftX, titleY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(90);
    const generated = `Generated on ${new Date().toLocaleString("en-LK")}`;
    doc.text(generated, textLeftX, titleY + 22);

    // Right: company block (name, address, email)
    const rightX = pageW - marginX - 260; // ~260px wide block
    const rightY = logoY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(COMPANY.name, rightX, rightY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(90);
    doc.text(COMPANY.address, rightX, rightY + 20);
    doc.text(COMPANY.email, rightX, rightY + 40);

    // Divider
    doc.setDrawColor(200);
    doc.setLineWidth(1);
    doc.line(marginX, logoY + 56, pageW - marginX, logoY + 56);

    // --- TABLE ---
    const head = [
      ["Bag Type", "Sewing Person", "Deadline", "Priority", "Status", "Details"],
    ];
    const body = (items || []).map((i) => [
      i.bag || "",
      i.person || "",
      i.deadline || "",
      i.priority || "",
      i.status || "",
      i.details || "",
    ]);

    autoTable(doc, {
      head,
      body,
      startY: logoY + 70, // below header
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [53, 79, 197], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 150 },
        2: { cellWidth: 100 },
        3: { cellWidth: 90 },
        4: { cellWidth: 110 },
        5: { cellWidth: "auto" },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: (data) => {
        const pageCount =
          doc.getNumberOfPages?.() ?? doc.internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageW - 80,
          pageH - 20
        );
      },
    });

    doc.save("sewing_instruction_report.pdf");
  };

  const BadgePriority = ({ p }) => {
    const cls = p === "High" ? "high" : p === "Medium" ? "medium" : "low";
    return <span className={`badge ${cls}`}>{p}</span>;
  };

  const BadgeStatus = ({ s }) => {
    const map = {
      "In Progress": "info",
      Pending: "pending",
      "Quality Check": "qc",
      Done: "low",
    };
    return <span className={`badge ${map[s] || "pending"}`}>{s}</span>;
  };

  if (loading)
    return (
      <div className="sew">
        <Sidebarhiru />
        <div className="page">
          <header className="topbar">
            <h1 className="page-title">Sewing Instructions</h1>
          </header>
          <main className="container">Loading…</main>
        </div>
      </div>
    );

  return (
    <div className="sew">
      <Sidebarhiru />

      <div className="page">
        <header className="topbar">
          <h1 className="page-title">Sewing Instructions</h1>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={exportPDF}>
              <span className="icon" aria-hidden="true">📄</span> Download PDF
            </button>
            <button className="avatar" title="Profile" aria-label="Profile">
              👤
            </button>
          </div>
        </header>

        <main className="container">
          <section className="section-head">
            <h2>Sewing Instructions</h2>

            {/* Search (Bag Type prefix only) + Add */}
            <div className="searchbar">
              <span className="search-icon" aria-hidden="true">🔎</span>
              <input
                className="search-input"
                type="text"
                placeholder="Filter by bag type (prefix)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter by bag type prefix"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  title="Clear"
                >
                  ✕
                </button>
              )}
              <button className="btn btn-primary" onClick={openCreate}>
                <span className="icon" aria-hidden="true">➕</span> Add Instruction
              </button>
            </div>
          </section>

          <section className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>BAG TYPE</th>
                    <th>SEWING PERSON</th>
                    <th>DEADLINE</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <p className="bag-title">{i.bag}</p>
                        <p className="bag-sub">{i.details}</p>
                      </td>
                      <td>{i.person}</td>
                      <td className="nowrap">{i.deadline}</td>
                      <td><BadgePriority p={i.priority} /></td>
                      <td><BadgeStatus s={i.status} /></td>
                      <td>
                        <div className="actions">
                          <button
                            className="icon-btn icon-view"
                            title="View"
                            onClick={() => setViewItem(i)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn icon-edit"
                            title="Edit"
                            onClick={() => openEdit(i)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M3 21l3-1 14-14-2-2L4 18l-1 3Z" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn icon-del"
                            title="Delete"
                            onClick={() => handleDelete(i.id)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M3 6h18M9 6V4h6v2M7 6l1 14h8l1-14" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "16px" }}>
                        {search ? "No bag types starting with that text." : "No instructions yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Create/Edit dialog */}
      <dialog ref={formRef} className="modal" onClose={() => setEditing(null)}>
        <form className="modal-card" onSubmit={handleSubmit} method="dialog">
          <h3>{editing?.id ? "Edit Instruction" : "Add Instruction"}</h3>
          <div className="grid">
            <label>
              Bag Type
              <input id="f_bag" type="text" value={form.bag} onChange={handleChange} required />
            </label>
            <label>
              Sewing Person
              <input
                id="f_person"
                type="text"
                value={form.person}
                onChange={handleChange}
                onKeyDown={handlePersonKeyDown}
                onPaste={handlePersonPaste}
                inputMode="text"
                autoComplete="off"
                maxLength={60}
                pattern="[A-Za-z ]+"
                title="Letters and spaces only (no numbers or symbols)."
                aria-invalid={personError ? "true" : "false"}
                required
              />
              {personError && (
                <small className="error" role="alert">
                  {personError}
                </small>
              )}
            </label>
            <label>
              Deadline
              <input id="f_deadline" type="date" value={form.deadline} onChange={handleChange} required />
            </label>
            <label>
              Priority
              <select id="f_priority" value={form.priority} onChange={handleChange} required>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="span-2">
              Details
              <textarea
                id="f_details"
                rows="3"
                value={form.details}
                onChange={handleChange}
                placeholder="materials, size, notes"
              />
            </label>
            <label>
              Status
              <select id="f_status" value={form.status} onChange={handleChange} required>
                <option>In Progress</option>
                <option>Pending</option>
                <option>Quality Check</option>
                <option>Done</option>
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                formRef.current?.close();
                setEditing(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </dialog>

      {/* View dialog */}
      <dialog ref={viewRef} className="modal" onClose={() => setViewItem(null)}>
        <div className="modal-card">
          <h3>Instruction</h3>
          {viewItem && (
            <div className="view-body">
              <p><strong>Bag:</strong> {viewItem.bag}</p>
              <p><strong>Details:</strong> {viewItem.details || "-"}</p>
              <p><strong>Person:</strong> {viewItem.person}</p>
              <p><strong>Deadline:</strong> {viewItem.deadline}</p>
              <p><strong>Priority:</strong> {viewItem.priority}</p>
              <p><strong>Status:</strong> {viewItem.status}</p>
            </div>
          )}
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                viewRef.current?.close();
                setViewItem(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
