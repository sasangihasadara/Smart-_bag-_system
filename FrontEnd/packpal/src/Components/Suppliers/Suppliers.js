// src/Components/Suppliers/Supplier.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Sidebarpul from "../Sidebar/Sidebarpul";
import "./Suppliers.css";

/* ------------------- Data ------------------- */
const suppliersData = {
  "Aisha Perera": {
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&h=300&fit=crop&auto=format",
    age: 29,
    service: 4,
    skills: ["Leatherwork", "Edge Painting", "Pattern Cutting"],
    contact: "+1 (555) 123-4567",
    email: "aisha.perera@email.com",
    company: "Premium Leather Co.",
    location: "Galle, Sri Lanka",
    rating: 4.8,
    totalOrders: 156,
    completedOrders: 152,
    materials: ["Premium Leather", "Italian Cowhide", "Suede"],
    specialization: "Luxury leather goods and custom bag designs",
    joinDate: "2020-03-15",
  },
  "John Chen": {
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&h=300&fit=crop&auto=format",
    age: 35,
    service: 7,
    skills: ["Canvas", "Heavy Stitching", "QA"],
    contact: "+1 (555) 234-5678",
    email: "john.chen@email.com",
    company: "Canvas Works Ltd.",
    location: "Colombo, Sri Lanka",
    rating: 4.9,
    totalOrders: 289,
    completedOrders: 285,
    materials: ["Heavy Canvas", "Cordura", "Ripstop Nylon"],
    specialization: "Durable outdoor and tactical bag manufacturing",
    joinDate: "2017-08-22",
  },
  "Maria Santos": {
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&h=300&fit=crop&auto=format",
    age: 31,
    service: 6,
    skills: ["Hand Stitching", "Zippers", "Hardware Fitting"],
    contact: "+1 (555) 345-6789",
    email: "maria.santos@email.com",
    company: "Artisan Crafts Inc.",
    location: "Kelaniya, Sri Lanka",
    rating: 4.7,
    totalOrders: 198,
    completedOrders: 195,
    materials: ["Premium Hardware", "YKK Zippers", "Metal Fixtures"],
    specialization: "Hardware installation and detailed finishing work",
    joinDate: "2018-05-10",
  },
  "Lisa Rodriguez": {
    photo:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?q=80&w=300&h=300&fit=crop&auto=format",
    age: 27,
    service: 3,
    skills: ["Crossbody", "Straps", "Finishing"],
    contact: "+1 (555) 456-7890",
    email: "lisa.rodriguez@email.com",
    company: "Modern Bag Solutions",
    location: "Galle, Sri Lanka",
    rating: 4.6,
    totalOrders: 87,
    completedOrders: 84,
    materials: ["Vegan Leather", "Recycled Materials", "Eco-Friendly Straps"],
    specialization: "Sustainable and modern crossbody bag designs",
    joinDate: "2021-11-08",
  },
  "Mike Johnson": {
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&h=300&fit=crop&auto=format",
    age: 38,
    service: 9,
    skills: ["Backpacks", "Reinforced Seams", "Training"],
    contact: "+1 (555) 567-8901",
    email: "mike.johnson@email.com",
    company: "Ceylon Leather Crafts (Pvt) Ltd.",
    location: "Colombo, Sri Lanka",
    rating: 5.0,
    totalOrders: 445,
    completedOrders: 445,
    materials: ["Ballistic Nylon", "Reinforcement Materials", "Padded Components"],
    specialization: "High-performance backpacks and team training programs",
    joinDate: "2015-01-12",
  },
  "Anna Park": {
    photo:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&h=300&fit=crop&auto=format",
    age: 26,
    service: 2,
    skills: ["Wallets", "Quality Check", "Packaging"],
    contact: "+1 (555) 678-9012",
    email: "anna.park@email.com",
    company: "Precision Accessories",
    location: "Kandy, Sri Lanka",
    rating: 4.5,
    totalOrders: 123,
    completedOrders: 118,
    materials: ["Fine Leather", "RFID Components", "Premium Packaging"],
    specialization: "Small leather goods and quality assurance",
    joinDate: "2022-06-20",
  },
};

/* ------------------- Helpers ------------------- */
function showNotification(message, type = "info") {
  const n = document.createElement("div");
  n.style.position = "fixed";
  n.style.top = "20px";
  n.style.right = "20px";
  n.style.background = type === "success" ? "#10b981" : type === "info" ? "#3b82f6" : "#f59e0b";
  n.style.color = "#fff";
  n.style.padding = "15px 20px";
  n.style.borderRadius = "10px";
  n.style.boxShadow = "0 10px 25px rgba(0,0,0,.1)";
  n.style.zIndex = "3000";
  n.style.fontWeight = "600";
  n.style.maxWidth = "350px";
  n.style.animation = "slideInRight .3s ease-out";
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => {
    n.style.animation = "slideOutRight .3s ease-out";
    setTimeout(() => n.remove(), 300);
  }, 3000);
}

// Load tools (jsPDF + html2canvas) for PDF export, on demand
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.body.appendChild(s);
  });
}
async function ensurePDFTools() {
  if (!window.jspdf?.jsPDF) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  if (!window.html2canvas) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }
  return { jsPDF: window.jspdf.jsPDF, html2canvas: window.html2canvas };
}

/* ------------------- Component ------------------- */
export default function Suppliers() {
  const [selected, setSelected] = useState(null); // supplier detail modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportHTML, setReportHTML] = useState("");

  const suppliers = useMemo(
    () => Object.entries(suppliersData).map(([name, s]) => ({ name, ...s })),
    []
  );

  // Esc closes any open modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        if (reportOpen) setReportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, reportOpen]);

  // Lock scroll while any modal is open
  useEffect(() => {
    const open = selected || reportOpen;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [selected, reportOpen]);

  /* ---------- Report ---------- */
  const buildSupplierReportData = useCallback(() => {
    const enriched = suppliers.map((s) => ({
      ...s,
      successRate: s.totalOrders ? s.completedOrders / s.totalOrders : 0,
    }));

    const totalSuppliers = enriched.length;
    const totalOrders = enriched.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalCompleted = enriched.reduce((sum, s) => sum + s.completedOrders, 0);
    const avgRating = totalSuppliers
      ? enriched.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers
      : 0;
    const avgSuccessRate = totalSuppliers
      ? enriched.reduce((sum, s) => sum + s.successRate, 0) / totalSuppliers
      : 0;
    const avgExperience = totalSuppliers
      ? enriched.reduce((sum, s) => sum + s.service, 0) / totalSuppliers
      : 0;

    const topRated = [...enriched].sort((a, b) => b.rating - a.rating).slice(0, 3);
    const mostExperienced = [...enriched].sort((a, b) => b.service - a.service).slice(0, 3);

    return {
      summary: {
        totalSuppliers,
        totalOrders,
        totalCompleted,
        avgRating,
        avgSuccessRate,
        avgExperience,
        reportDate: new Date().toLocaleString(),
      },
      topRated,
      mostExperienced,
      suppliers: enriched,
    };
  }, [suppliers]);

  function supplierReportHTML(data) {
    const { summary, topRated, mostExperienced, suppliers: rows } = data;

    const stats = `
    <br>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0;">
        ${[
          ["Total Suppliers", summary.totalSuppliers],
          ["Total Orders", summary.totalOrders.toLocaleString()],
          ["Completed Orders", summary.totalCompleted.toLocaleString()],
          ["Average Rating", `${summary.avgRating.toFixed(1)}/5.0`],
          ["Success Rate", `${(summary.avgSuccessRate * 100).toFixed(1)}%`],
          ["Avg Experience", `${summary.avgExperience.toFixed(1)} yrs`],
        ]
          .map(
            ([label, value]) => `
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:#111827">${value}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px">${label}</div>
          </div>`
          )
          .join("")}
      </div>`;

    const list = (title, items, subtitle) => `
    <br>
      <div style="margin:18px 0;">
        <h3 style="color:#334155;margin:0 0 10px 0">${title}</h3>
        <div style="display:grid;grid-template-columns:1fr;gap:8px">
          ${items
            .map(
              (s, i) => `
            <div style="display:flex;align-items:flex-start;gap:10px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
              <div style="background:${
                title.includes("Rated") ? "#10b981" : "#f59e0b"
              };color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700">${i + 1}</div>
              <div>
                <div style="font-weight:700;color:#111827">${s.name}</div>
                <div style="font-size:12px;color:#6b7280">${subtitle(s)}</div>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;

    const highestRated = list(
      "Highest Rated Suppliers",
      topRated,
      (s) => `${s.rating}/5.0 ⭐ • ${s.company}`
    );

    const mostExp = list(
      "Most Experienced Suppliers",
      mostExperienced,
      (s) => `${s.service} years • ${s.specialization}`
    );

    const tableRows = rows
      .map(
        (s) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.company}</td>
          <td>${s.location}</td>
          <td style="text-align:center">${s.rating.toFixed(1)}</td>
          <td style="text-align:center">${s.totalOrders}</td>
          <td style="text-align:center">${(s.successRate * 100).toFixed(1)}%</td>
          <td style="text-align:center">${s.service}y</td>
        </tr>`
      )
      .join("");

    const directory = `
      <div style="margin:22px 0">
        <h3 style="color:#334155;margin:0 0 10px 0">📋 Supplier Directory</h3>
        <table class="report-table" style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#2563eb;color:#fff">
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:left">Name</th>
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:left">Company</th>
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:left">Location</th>
              <th style="padding:10px;border:1px solid #e5e7eb">Rating</th>
              <th style="padding:10px;border:1px solid #e5e7eb">Orders</th>
              <th style="padding:10px;border:1px solid #e5e7eb">Success</th>
              <th style="padding:10px;border:1px solid #e5e7eb">Exp.</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>`;

    return `
      <div class="report-header" style="text-align:center;margin-bottom:18px;padding-bottom:16px;border-bottom:3px solid #2563eb">
        <div style="display:inline-flex;align-items:center;gap:10px">
          <div style="width:44px;height:44px;border-radius:10px;background:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff">📦</div>
          <div style="text-align:left">
            <div style="font-weight:800;color:#111827;font-size:22px;margin:0">PackPal — Supplier Performance Report</div>
            <div style="color:#6b7280;font-size:12px;margin-top:4px">Generated on ${summary.reportDate}</div>
          </div>
        </div>
      </div>

      ${stats}
      ${highestRated}
      ${mostExp}
      ${directory}

      <div class="report-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
        <button class="report-btn btn-pdf"  style="padding:10px 14px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer" onclick="window.__sup_exportToPDF()">📄 Export to PDF</button>
        <button class="report-btn btn-print" style="padding:10px 14px;border-radius:10px;border:0;background:#111827;color:#fff;font-weight:700;cursor:pointer" onclick="window.__sup_printReport()">🖨️ Print</button>
        <button class="report-btn btn-json"  style="padding:10px 14px;border-radius:10px;border:0;background:#10b981;color:#fff;font-weight:700;cursor:pointer" onclick="window.__sup_downloadJSON()">📊 Download JSON</button>
      </div>
    `;
  }

  function openSupplierReport() {
    const data = buildSupplierReportData();
    const html = supplierReportHTML(data);
    setReportHTML(html);
    setReportOpen(true);
  }

  // Export/Print/JSON handlers (used by buttons inside the HTML string)
  useEffect(() => {
    function exportToPDF() {
      (async () => {
        const data = buildSupplierReportData();
        const contentHTML = supplierReportHTML(data).replace(
          /<div class="report-actions"[\s\S]*<\/div>\s*$/i,
          ""
        );

        const temp = document.createElement("div");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        temp.style.top = "0";
        temp.style.width = "794px";
        temp.style.padding = "40px";
        temp.style.fontFamily = "Inter, Arial, sans-serif";
        temp.style.fontSize = "14px";
        temp.style.lineHeight = "1.45";
        temp.style.color = "#111827";
        temp.style.background = "#ffffff";
        temp.innerHTML = contentHTML;

        document.body.appendChild(temp);

        const { jsPDF, html2canvas } = await ensurePDFTools();
        const canvas = await html2canvas(temp, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: 794,
          height: temp.scrollHeight,
        });
        document.body.removeChild(temp);

        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgW = 210;
        const pageH = 297;
        const imgH = (canvas.height * imgW) / canvas.width;

        let hLeft = imgH;
        let pos = 0;
        pdf.addImage(img, "PNG", 0, pos, imgW, imgH);
        hLeft -= pageH;
        while (hLeft > 0) {
          pos = hLeft - imgH;
          pdf.addPage();
          pdf.addImage(img, "PNG", 0, pos, imgW, imgH);
          hLeft -= pageH;
        }
        pdf.save(`supplier_report_${new Date().toISOString().split("T")[0]}.pdf`);
      })().catch((e) => {
        console.error(e);
        alert("PDF export failed. Please try again.");
      });
    }

    function printReport() {
      const src = document.getElementById("supReportContent")?.innerHTML || "";
      const w = window.open("", "_blank");
      const doc = `
        <!DOCTYPE html><html><head><title>Supplier Report</title>
        <meta charset="utf-8"/>
        <style>
          body{font-family:Inter, Arial, sans-serif;margin:0;padding:20px;color:#111827}
          .report-actions{display:none}
          table{width:100%;border-collapse:collapse}
          thead th{background:#2563eb;color:#fff;padding:8px;border:1px solid #e5e7eb;text-align:left}
          tbody td{padding:8px;border:1px solid #e5e7eb}
          @media print{ @page{ margin:16mm } }
        </style></head><body>${src}</body></html>`;
      w.document.open();
      w.document.write(doc);
      w.document.close();
      w.focus();
      w.print();
    }

    function downloadJSON() {
      const data = buildSupplierReportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `supplier_report_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    window.__sup_exportToPDF = exportToPDF;
    window.__sup_printReport = printReport;
    window.__sup_downloadJSON = downloadJSON;

    return () => {
      delete window.__sup_exportToPDF;
      delete window.__sup_printReport;
      delete window.__sup_downloadJSON;
    };
  }, [buildSupplierReportData]);

  const contactSupplier = (s) => {
    const message = `Hello ${s.name},%0D%0A%0D%0AWe hope this message finds you well. We wanted to reach out regarding potential new orders and discuss our upcoming project requirements.%0D%0A%0D%0APlease let us know your current availability and production capacity.%0D%0A%0D%0ABest regards,%0DPackPal Inventory Team`;
    window.location.href = `mailto:${s.email}?subject=New Order Inquiry - PackPal&body=${message}`;
    setSelected(null);
  };

  return (
    <div className="sup">
      <Sidebarpul />

      <main className="main" style={{ flex: 1 }}>
        <section className="dashboard">
          <header className="header">
            <h1>🏭 Supplier Management</h1>
            <div className="header-actions">
              <button className="generate-report-btn" type="button" onClick={openSupplierReport}>
                📊 Generate Report
              </button>
            </div>
          </header>

          <div className="suppliers-header">
            <h2 style={{ color: "#2c3e50", fontSize: 20 }}>Suppliers</h2>
            <div className="suppliers-count">
              {suppliers.length} shown • {suppliers.length} total
            </div>
          </div>

          <div className="suppliers-grid">
            {suppliers.map((s) => (
              <article key={s.name} className="supplier-card">
                <div className="supplier-header">
                  <div className="supplier-info">
                    <h3>{s.name}</h3>
                    <div className="supplier-meta">
                      <div className="age-service">
                        Age {s.age} • Service {s.service} years
                      </div>
                    </div>
                  </div>
                  <div className="years-badge">{s.service} yrs</div>
                </div>

                <div className="supplier-details">
                  <div className="supplier-avatar">
                    <img src={s.photo} alt={s.name} />
                  </div>
                  <div className="supplier-skills">
                    {s.skills.map((skill, i) => (
                      <span
                        key={skill}
                        className={`skill-tag ${i === 0 ? "primary" : i === 1 ? "secondary" : ""}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <button type="button" className="eye-btn" onClick={() => setSelected(s)}>
                  <span className="eye-icon">👁️</span>View
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Supplier Details Modal */}
      <div
        className={`modal ${selected ? "open" : ""}`}
        onClick={() => setSelected(null)}
        aria-modal="true"
      >
        <div className="modal-content" role="dialog" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={() => setSelected(null)} aria-label="Close">
            &times;
          </button>

          {selected && (
            <>
              <div className="modal-header">
                <h2 id="modalTitle">{selected.name} — Supplier Details</h2>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flex: "0 0 56px" }}>
                  <img
                    src={selected.photo}
                    alt={selected.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {selected.company} — {selected.location}
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>👤 Personal Information</h4>
                <div className="detail-item">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{selected.age} years</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Years of Service:</span>
                  <span className="detail-value">{selected.service} years</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Join Date:</span>
                  <span className="detail-value">{new Date(selected.joinDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>🏢 Company Information</h4>
                <div className="detail-item">
                  <span className="detail-label">Company:</span>
                  <span className="detail-value">{selected.company}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selected.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Specialization:</span>
                  <span className="detail-value">{selected.specialization}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>📞 Contact Information</h4>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selected.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selected.contact}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>🎯 Skills & Expertise</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
                  {selected.skills.map((skill, i) => (
                    <span
                      key={skill}
                      className={`skill-tag ${i === 0 ? "primary" : i === 1 ? "secondary" : ""}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h4>📊 Performance Metrics</h4>
                <div className="detail-item">
                  <span className="detail-label">Rating:</span>
                  <span className="detail-value">{selected.rating}/5.0 ⭐</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Orders:</span>
                  <span className="detail-value">{selected.totalOrders.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Completed Orders:</span>
                  <span className="detail-value">{selected.completedOrders.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Success Rate:</span>
                  <span className="detail-value">
                    {selected.totalOrders > 0
                      ? ((selected.completedOrders / selected.totalOrders) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 25,
                  paddingTop: 20,
                  borderTop: "2px solid #f0f0f0",
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => {
                    showNotification(
                      `✏️ Edit functionality for ${selected.name} will be implemented in the next update.`,
                      "info"
                    );
                    setSelected(null);
                  }}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg,#667eea,#764ba2)",
                    color: "#fff",
                    border: "none",
                    padding: 12,
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Edit Supplier
                </button>

                <button
                  onClick={() => contactSupplier(selected)}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff",
                    border: "none",
                    padding: 12,
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📞 Contact
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Modal (preview) */}
      <div
        id="supReportModal"
        className={`modal ${reportOpen ? "open" : ""}`}
        onClick={() => setReportOpen(false)}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={() => setReportOpen(false)} aria-label="Close">
            &times;
          </button>
          <div id="supReportContent" dangerouslySetInnerHTML={{ __html: reportHTML }} />
        </div>
      </div>
    </div>
  );
}
