import React, { useMemo, useRef, useState } from "react";
import "./Employee.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";

export default function Employee() {
  // ----- data (replace with API later) -----
  const employees = useMemo(
    () => [
      {
        id: crypto.randomUUID(),
        name: "Aisha Perera",
        age: 29,
        service: 4,
        yearsLabel: "4 yrs",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format",
        skills: ["Leatherwork", "Edge Painting", "Pattern Cutting"],
      },
      {
        id: crypto.randomUUID(),
        name: "John Chen",
        age: 35,
        service: 7,
        yearsLabel: "7 yrs",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format",
        skills: ["Canvas", "Heavy Stitching", "QA"],
      },
      {
        id: crypto.randomUUID(),
        name: "Maria Santos",
        age: 31,
        service: 6,
        yearsLabel: "6 yrs",
        avatar:
          "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=300&auto=format",
        skills: ["Hand Stitching", "Zippers", "Hardware Fitting"],
      },
      {
        id: crypto.randomUUID(),
        name: "Lisa Rodriguez",
        age: 27,
        service: 3,
        yearsLabel: "3 yrs",
        avatar:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format",
        skills: ["Crossbody", "Straps", "Finishing"],
      },
      {
        id: crypto.randomUUID(),
        name: "Mike Johnson",
        age: 38,
        service: 9,
        yearsLabel: "9 yrs",
        avatar:
          "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=300&auto=format",
        skills: ["Backpacks", "Reinforced Seams", "Training"],
      },
      {
        id: crypto.randomUUID(),
        name: "Anna Park",
        age: 26,
        service: 2,
        yearsLabel: "2 yrs",
        avatar:
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format",
        skills: ["Wallets", "Quality Check", "Packaging"],
      },
    ],
    []
  );

  // ----- state for View dialog -----
  const [selected, setSelected] = useState(null);
  const modalRef = useRef(null);

  const openView = (emp) => {
    setSelected(emp);
    modalRef.current?.showModal();
  };
  const closeView = () => {
    modalRef.current?.close();
    setSelected(null);
  };

  // ----- CSV export -----
  const downloadCSV = () => {
    const header = ["Name", "Age", "Service (years)", "Skills"];
    const rows = employees.map((e) => [
      e.name,
      e.age,
      e.service,
      e.skills.join(" | "),
    ]);
    const toCSV = (rows) =>
      rows
        .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([toCSV([header, ...rows])], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  return (
    <div className="emp">
      <Sidebarhiru />

      {/* Page wrapper that respects the sidebar width */}
      <div className="page">
        <header className="topbar">
          <h1 className="page-title">Employee</h1>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={downloadCSV}>
              <span className="icon">📄</span> Generate Report
            </button>
            <button className="avatar" title="Profile" aria-label="Profile">
              👤
            </button>
          </div>
        </header>

        <main className="container" role="main">
          <section className="section-head">
            <h2>Employees</h2>
            <span className="muted">
              {employees.length} shown • {employees.length} total
            </span>
          </section>

          <section className="cards">
            {employees.map((e) => (
              <article key={e.id} className="card">
                <img className="avatar-lg" src={e.avatar} alt={e.name} />
                <div className="card-main">
                  <div className="card-title">
                    <h3>{e.name}</h3>
                    <span className="badge-age">{e.yearsLabel}</span>
                  </div>
                  <p className="card-sub">
                    Age {e.age} • Service {e.service} years
                  </p>
                  <div className="skill-wrap">
                    {e.skills.map((s) => (
                      <span key={s} className="skill">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="actions">
                  <button className="view" onClick={() => openView(e)}>
                    <EyeIcon /> <span>View</span>
                  </button>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>

      {/* View dialog */}
      <dialog ref={modalRef} className="modal" onClose={closeView} aria-modal="true">
        <div className="modal-card" role="dialog" aria-labelledby="empTitle">
          <h3 id="empTitle">{selected?.name ?? "Employee"}</h3>
          <p className="muted">
            {selected ? `Age ${selected.age} • Service ${selected.service} years` : ""}
          </p>
          <div className="skill-wrap">
            {selected?.skills?.map((s) => (
              <span key={s} className="skill">
                {s}
              </span>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={closeView}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
