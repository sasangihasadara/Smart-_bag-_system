import React, { useState, useCallback, useEffect, useMemo } from "react";
import "./Quality.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";
import { api } from "../../lib/api2";

export default function Quality() {
  // Items currently in "Quality Check" (from backend)
  const [qcItems, setQcItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recent session logs for display (optional, UX sugar)
  const [passedLog, setPassedLog] = useState([]);
  const [failedLog, setFailedLog] = useState([]);

  // Dashboard totals stored in localStorage (source of truth for UI sync)
  const [totalPassed, setTotalPassed] = useState(
    Number(localStorage.getItem("qc:passed") || 0)
  );
  const [totalFailed, setTotalFailed] = useState(
    Number(localStorage.getItem("qc:failed") || 0)
  );

  // ---------- helpers ----------
  const publishCountsDelta = useCallback((dPassed, dFailed) => {
    const curP = Number(localStorage.getItem("qc:passed") || 0);
    const curF = Number(localStorage.getItem("qc:failed") || 0);
    const nextP = Math.max(0, curP + (dPassed || 0));
    const nextF = Math.max(0, curF + (dFailed || 0));
    localStorage.setItem("qc:passed", String(nextP));
    localStorage.setItem("qc:failed", String(nextF));
    localStorage.setItem("qc:lastUpdate", String(Date.now()));
    setTotalPassed(nextP);
    setTotalFailed(nextF);
    window.dispatchEvent(new Event("quality:changed"));
  }, []);

  const ensureCountKeys = useCallback(() => {
    if (localStorage.getItem("qc:passed") == null)
      localStorage.setItem("qc:passed", "0");
    if (localStorage.getItem("qc:failed") == null)
      localStorage.setItem("qc:failed", "0");
  }, []);

  const pullCounts = useCallback(() => {
    setTotalPassed(Number(localStorage.getItem("qc:passed") || 0));
    setTotalFailed(Number(localStorage.getItem("qc:failed") || 0));
  }, []);

  // ---------- data load ----------
  const loadQC = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/quality");
      setQcItems(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load quality queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureCountKeys();
    pullCounts();
    loadQC();
  }, [ensureCountKeys, pullCounts, loadQC]);

  // Also refresh if another tab updates QC
  useEffect(() => {
    const onS = (e) => {
      if (
        e.key === "qc:lastUpdate" ||
        e.key === "qc:passed" ||
        e.key === "qc:failed"
      ) {
        pullCounts();
      }
    };
    window.addEventListener("storage", onS);
    return () => window.removeEventListener("storage", onS);
  }, [pullCounts]);

  // ---------- actions ----------
  const markPass = useCallback(
    async (id) => {
      try {
        const { data } = await api.post(`/api/quality/${id}/pass`);
        // Remove from QC list (it’s no longer in Quality Check)
        setQcItems((list) => list.filter((it) => it._id !== id && it.id !== id));

        // Log to page
        const after = data?.after || {};
        setPassedLog((prev) => [
          {
            id: after._id || id,
            bag: after.bag,
            person: after.person,
            date: new Date(after.qcDate || Date.now())
              .toISOString()
              .slice(0, 10),
          },
          ...prev,
        ]);

        // Increment dashboard counters
        publishCountsDelta(+1, 0);
      } catch (e) {
        console.error(e);
        alert("Mark pass failed");
      }
    },
    [publishCountsDelta]
  );

  const markFail = useCallback(
    async (id) => {
      const reason = window.prompt("Enter failure reason:", "") || "";
      try {
        const { data } = await api.post(`/api/quality/${id}/fail`, {
          note: reason,
        });
        // Remove from QC list
        setQcItems((list) => list.filter((it) => it._id !== id && it.id !== id));

        // Log to page
        const after = data?.after || {};
        setFailedLog((prev) => [
          {
            id: after._id || id,
            bag: after.bag,
            person: after.person,
            date: new Date(after.qcDate || Date.now())
              .toISOString()
              .slice(0, 10),
            note: after.qcNote || reason || "",
          },
          ...prev,
        ]);

        // Increment dashboard counters
        publishCountsDelta(0, +1);
      } catch (e) {
        console.error(e);
        alert("Mark fail failed");
      }
    },
    [publishCountsDelta]
  );

  // ---------- derived ----------
  const qcRows = useMemo(() => qcItems, [qcItems]);

  // ---------- pdf ----------
  const generatePdf = useCallback(async () => {
    let jsPDFCtor, autoTableFn;
    try {
      jsPDFCtor = (await import("jspdf")).jsPDF;
      autoTableFn = (await import("jspdf-autotable")).default;
    } catch {
      if (window.jspdf) jsPDFCtor = window.jspdf.jsPDF;
    }
    if (!jsPDFCtor) {
      alert(
        "PDF libs not found. Run: npm i jspdf jspdf-autotable (or add CDN scripts)."
      );
      return;
    }

    const doc = new jsPDFCtor({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Quality Control — Queue", 40, 40);

    const rows = qcRows.map((r) => [
      r.bag,
      r.person,
      r.deadline?.slice(0, 10) || r.date || "-",
      "Quality Check",
      r.details || "-",
    ]);

    if (autoTableFn) {
      autoTableFn(doc, {
        startY: 60,
        head: [["Bag Type", "Sewing Person", "Deadline", "Status", "Note"]],
        body: rows,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [247, 249, 255], textColor: 30 },
        theme: "grid",
      });
    } else if (doc.autoTable) {
      doc.autoTable({
        startY: 60,
        head: [["Bag Type", "Sewing Person", "Deadline", "Status", "Note"]],
        body: rows,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [247, 249, 255], textColor: 30 },
        theme: "grid",
      });
    }

    doc.save("quality-queue.pdf");
  }, [qcRows]);

  // ---------- ui helpers ----------
  const Pill = ({ status }) => {
    const cls =
      status === "Passed" ? "pass" : status === "Failed" ? "fail" : "pending";
    return <span className={`pill ${cls}`}>{status}</span>;
  };

  const FailNote = ({ text }) =>
    !text ? null : (
      <div className="note">
        <svg viewBox="0 0 24 24" className="warn">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{text}</span>
      </div>
    );

  if (loading) {
    return (
      <div className="quality">
        <Sidebarhiru />
        <div className="page">
          <header className="topbar">
            <div className="container">
              <h1 className="title">Quality Control</h1>
            </div>
          </header>
          <main className="container pad">Loading…</main>
        </div>
      </div>
    );
  }

  return (
    <div className="quality">
      <Sidebarhiru />

      <div className="page">
        <header className="topbar">
          <div className="container">
            <h1 className="title">Quality Control</h1>
            <div className="actions-right">
              <button
                onClick={generatePdf}
                className="btn btn-primary"
                id="reportBtn"
              >
                <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
                  <path
                    d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM13 2v6h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Generate Report
              </button>
              <div className="avatar" title="Profile" aria-label="Profile">
                <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
                  <path
                    d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          </div>
        </header>

        <main className="container pad">
          {/* QC Queue Table (items in "Quality Check") */}
          <div className="table-card">
            <table className="qc-table">
              <thead>
                <tr>
                  <th>BAG TYPE</th>
                  <th>SEWING PERSON</th>
                  <th>DEADLINE</th>
                  <th>STATUS</th>
                  <th className="txt-r">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {qcRows.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>{item.bag}</td>
                    <td>{item.person}</td>
                    <td>{(item.deadline || item.date || "").slice(0, 10)}</td>
                    <td>
                      <Pill status={"Quality Check"} />
                      {item.details && (
                        <div className="mini-note">{item.details}</div>
                      )}
                    </td>
                    <td className="txt-r">
                      <div className="actions-group">
                        <button
                          className="btn-mini btn-pass"
                          onClick={() => markPass(item._id || item.id)}
                        >
                          Pass
                        </button>
                        <button
                          className="btn-mini btn-fail"
                          onClick={() => markFail(item._id || item.id)}
                        >
                          Fail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {qcRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                      No items in Quality Check.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Optional recent logs (kept for future use) */}
          {/* <pre>{JSON.stringify({ passedLog, failedLog, totalPassed, totalFailed }, null, 2)}</pre> */}
        </main>
      </div>
    </div>
  );
}
