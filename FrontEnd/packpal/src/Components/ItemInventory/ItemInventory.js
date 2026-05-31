// src/Components/ItemInventory/ItemInventory.js
import React, { useEffect, useRef } from "react";
import "./ItemInventory.css";
import Sidebarpul from "../Sidebar/Sidebarpul";
import { api } from "../../lib/api1";

/* ---------------------------
   Runtime PDF tools loader (jsPDF + AutoTable)
   --------------------------- */
function getJsPDFCtor() {
  if (window?.jspdf?.jsPDF) return window.jspdf.jsPDF; // UMD 2.x
  if (window?.jsPDF) return window.jsPDF;               // older global
  return null;
}
function hasAutoTable() {
  const jsPDF = getJsPDFCtor();
  return !!(jsPDF && jsPDF.API && jsPDF.API.autoTable);
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function ensurePdfTools() {
  if (getJsPDFCtor() && hasAutoTable()) return;
  const urls = [];
  if (!getJsPDFCtor()) {
    urls.push("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  if (!hasAutoTable()) {
    urls.push("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.3/jspdf.plugin.autotable.min.js");
  }
  for (const url of urls) await loadScript(url);
  if (!getJsPDFCtor() || !hasAutoTable()) throw new Error("Failed to load jsPDF/AutoTable");
}

export default function ItemInventory() {
  // Seed data (UI shows instantly; gets replaced by backend)
  const inventoryRef = useRef([
    { id: "1001", name: "Leather Backpack",  description: "Brown leather bag", quantity: 450, unitPrice: 80.0,  avgDailyUsage: 3, leadTimeDays: 3, reorderAdj: 0 },
    { id: "1002", name: "Canvas Tote",       description: "Beige shoulder bag", quantity: 300, unitPrice: 25.0,  avgDailyUsage: 2, leadTimeDays: 2, reorderAdj: 0 },
    { id: "1003", name: "Laptop Briefcase",  description: "Black laptop bag",   quantity: 12,  unitPrice: 110.0, avgDailyUsage: 1, leadTimeDays: 5, reorderAdj: 0 },
    { id: "1004", name: "Travel Duffel",     description: "Large blue bag",     quantity: 500, unitPrice: 20.0,  avgDailyUsage: 2, leadTimeDays: 2, reorderAdj: 0 },
    { id: "1005", name: "Travel Duffel",     description: "Large blue bag",     quantity: 10,  unitPrice: 110.0, avgDailyUsage: 1, leadTimeDays: 7, reorderAdj: 0 }
  ]);
  const editingIndexRef = useRef(-1);

  useEffect(() => {
    const SAFETY_STOCK = 20;
    const $ = (id) => document.getElementById(id);
    const toNum = (v) => Number(v) || 0;
    const asLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

    // ✅ Effective Reorder Level includes dynamic reorderAdj
    const computeReorderLevel = (item) =>
      Math.max(
        0,
        Math.round(
          (toNum(item.avgDailyUsage) * toNum(item.leadTimeDays)) +
          SAFETY_STOCK +
          toNum(item.reorderAdj || 0)
        )
      );

    const totalPriceOf = (item) => (toNum(item.unitPrice) * toNum(item.quantity));

    function showInlineForm(show = true) {
      const c = $("inlineForm");
      if (c) c.style.display = show ? "block" : "none";
      if (show) $("itemId")?.focus();
    }
    function updateRopPreview() {
      const preview =
        (toNum($("avgDailyUsage")?.value) * toNum($("leadTimeDays")?.value)) + SAFETY_STOCK;
      if ($("reorderLevel")) $("reorderLevel").value = Math.max(0, Math.round(preview));
      if ($("safetyStock")) $("safetyStock").value = SAFETY_STOCK;
    }
    function resetForm() {
      $("itemForm")?.reset();
      if ($("formTitle")) $("formTitle").textContent = "Add New Item";
      if ($("reorderLevel")) $("reorderLevel").value = 0;
      if ($("avgDailyUsage")) $("avgDailyUsage").value = 0;
      if ($("leadTimeDays")) $("leadTimeDays").value = 0;
      if ($("safetyStock")) $("safetyStock").value = SAFETY_STOCK;
      editingIndexRef.current = -1;
      updateRopPreview();
      $("itemName")?.setCustomValidity("");
      $("quantity")?.setCustomValidity("");
    }

    function updateStats() {
      const inventory = inventoryRef.current;
      const totalItems = inventory.length;
      const low = inventory.filter((i) => toNum(i.quantity) <= computeReorderLevel(i)).length;
      const value = inventory.reduce((s, i) => s + totalPriceOf(i), 0);
      if ($("totalItems")) $("totalItems").textContent = totalItems;
      if ($("lowStockItems")) $("lowStockItems").textContent = low;
      if ($("totalValue")) $("totalValue").textContent = asLKR(value);
    }

    function renderTable(list = inventoryRef.current) {
      const tbody = $("inventoryBody");
      if (!tbody) return;
      tbody.innerHTML = "";
      list.forEach((item, index) => {
        const rop = computeReorderLevel(item);
        const totalPrice = totalPriceOf(item);
        const tr = document.createElement("tr");
        if (toNum(item.quantity) <= rop) tr.classList.add("low-stock");
        tr.innerHTML = `
          <td class="item-id">${item.id}</td>
          <td class="item-name">${item.name}</td>
          <td>${item.description}</td>
          <td class="quantity">${item.quantity}</td>
          <td class="reorder-level">${rop}</td>
          <td class="unit-price">LKR ${Number(toNum(item.unitPrice)).toFixed(2)}</td>
          <td class="price">${asLKR(totalPrice)}</td>
          <td>
            <div class="action-cell">
              <button class="btn-edit"   onclick="window.__inv_editItem(${index})">Edit</button>
              <button class="btn-delete" onclick="window.__inv_deleteItem(${index})">Delete</button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
      updateStats();
    }

    // ===== API helpers =====
    const apiInv = {
      create: (item) => api.post("/api/inventory", item),
      update: (id, item) => api.put(`/api/inventory/${encodeURIComponent(id)}`, item),
      remove: (id) => api.delete(`/api/inventory/${encodeURIComponent(id)}`),
      list:   () => api.get("/api/inventory"),
    };

    // ===== CRUD =====
    function editItem(index) {
      const it = inventoryRef.current[index];
      showInlineForm(true);
      if ($("formTitle")) $("formTitle").textContent = "Edit Item";
      $("itemId").value = it.id;
      $("itemName").value = it.name;
      $("description").value = it.description;
      $("quantity").value = it.quantity;
      $("unitPrice").value = it.unitPrice;
      $("avgDailyUsage").value = toNum(it.avgDailyUsage);
      $("leadTimeDays").value = toNum(it.leadTimeDays);
      $("safetyStock").value = SAFETY_STOCK;
      updateRopPreview();
      editingIndexRef.current = index;
      $("inlineForm")?.scrollIntoView({ behavior: "smooth" });
      validateNameField();
      validateQuantityField();
    }

    async function deleteItem(index) {
      const item = inventoryRef.current[index];
      if (!window.confirm(`Delete "${item.name}" (ID: ${item.id})?`)) return;
      try {
        await apiInv.remove(item.id);
        const res = await apiInv.list();
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        inventoryRef.current = items.map((it) => ({
          id: String(it.id ?? it._id ?? ""),
          name: it.name ?? "",
          description: it.description ?? "",
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          avgDailyUsage: Number(it.avgDailyUsage ?? 0),
          leadTimeDays: Number(it.leadTimeDays ?? 0),
          reorderAdj: Number(it.reorderAdj ?? 0),
        }));
        renderTable();
      } catch (err) {
        console.error("DELETE ERROR:", err?.toJSON?.() || err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.statusText ||
          err?.message ||
          "Delete failed";
        alert(`Delete failed: ${msg}`);
      }
    }

    window.__inv_editItem = editItem;
    window.__inv_deleteItem = deleteItem;

    // ===== Report builders =====
    function buildInventoryReport() {
      const inventory = inventoryRef.current;
      const lowStockItems = inventory.filter((i) => toNum(i.quantity) <= computeReorderLevel(i));
      const totalValue = inventory.reduce((s, i) => s + totalPriceOf(i), 0);
      const avgUnit =
        inventory.reduce((s, i) => s + toNum(i.unitPrice), 0) / (inventory.length || 1);
      const totalQty = inventory.reduce((s, i) => s + toNum(i.quantity), 0);

      const inventoryWithCalcs = inventory.map((item) => ({
        ...item,
        reorderLevel: computeReorderLevel(item),
        totalPrice: totalPriceOf(item),
        isLowStock: toNum(item.quantity) <= computeReorderLevel(item),
      }));

      return {
        summary: {
          totalItems: inventory.length,
          totalQuantity: totalQty,
          totalValue,
          avgUnitPrice: avgUnit,
          lowStockCount: lowStockItems.length,
          fixedSafetyStock: 20,
          reportDate: new Date().toLocaleString(),
        },
        inventory: inventoryWithCalcs,
        lowStockItems: lowStockItems.map((i) => ({
          ...i,
          reorderLevel: computeReorderLevel(i),
          totalPrice: totalPriceOf(i),
        })),
      };
    }

    function inventoryReportHTML(reportData) {
      const { summary, inventory: items, lowStockItems } = reportData;

      const statCard = (num, label, color) => `
        <div class="report-stat v2">
          <div class="report-stat-number" style="color:${color}">${num}</div>
          <div class="report-stat-label">${label}</div>
        </div>`;

      const lowStockSection = `
        <div class="section-title danger">⚠️ Low Stock Alert</div>
        ${
          lowStockItems.length
            ? `
          <table class="report-table report-table--danger">
            <thead><tr>
              <th>ITEM ID</th><th>ITEM NAME</th><th>CURRENT QTY</th>
              <th>REORDER LEVEL</th><th>SHORTAGE</th><th>UNIT PRICE</th>
            </tr></thead>
            <tbody>
              ${lowStockItems
                .map(
                  (i) => `
                <tr>
                  <td>${i.id}</td><td>${i.name}</td><td>${i.quantity}</td>
                  <td>${i.reorderLevel}</td><td>${Math.max(0, i.reorderLevel - i.quantity)}</td>
                  <td>LKR ${Number(i.unitPrice).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>`
            : `<div class="banner-ok">Great news — no items are currently below their reorder level.</div>`
        }`;

      const allInventorySection = `
        <div class="section-title">📦 Complete Inventory</div>
        <table class="report-table report-table--primary">
          <thead><tr>
            <th>ITEM ID</th><th>ITEM NAME</th><th>DESCRIPTION</th><th>QUANTITY</th>
            <th>REORDER LEVEL</th><th>UNIT PRICE</th><th>TOTAL VALUE</th>
          </tr></thead>
          <tbody>
            ${items
              .map(
                (i) => `
              <tr ${i.isLowStock ? 'class="low-stock-highlight"' : ""}>
                <td>${i.id}</td><td>${i.name}</td><td>${i.description}</td>
                <td>${i.quantity}</td><td>${i.reorderLevel}</td>
                <td>LKR ${Number(i.unitPrice).toFixed(2)}</td>
                <td>LKR ${i.totalPrice.toLocaleString()}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;

      return `
        <div class="report-header">
          <h1 class="report-title">🧾 Inventory Management Report</h1>
          <p class="report-subtitle">Generated on ${summary.reportDate}</p>
        </div>

        <div class="report-stats v2">
          ${statCard(summary.totalItems, "TOTAL ITEMS", "#3563ff")}
          ${statCard(summary.totalQuantity.toLocaleString(), "TOTAL QUANTITY", "#3563ff")}
          ${statCard("LKR " + summary.totalValue.toLocaleString(), "TOTAL VALUE", "#3563ff")}
          ${statCard(summary.lowStockCount, "LOW STOCK ITEMS", "#e74c3c")}
          ${statCard(summary.fixedSafetyStock, "SAFETY STOCK", "#3563ff")}
        </div>

        ${lowStockSection}
        ${allInventorySection}

        <div class="report-actions">
          <button class="report-btn btn-pdf"  onclick="window.__inv_exportToPDF()">📄 Export to PDF</button>
          <button class="report-btn btn-print" onclick="window.__inv_printReport()">🖨️ Print Report</button>
        </div>`;
    }

    function generateReport() {
      const data = buildInventoryReport();
      const el = $("reportContent");
      if (el) el.innerHTML = inventoryReportHTML(data);
      const modal = $("reportModal");
      if (modal) modal.style.display = "block";
    }
    window.__inv_generateReport = generateReport;

    // ✅ FIX: don't use 'e' here
    function closeReportModal() {
      const m = $("reportModal");
      if (m) m.style.display = "none";
    }

    /* ===== simple vector icons for PDF ===== */
    function drawWarningIcon(doc, x, y) {
      doc.setFillColor(244, 143, 64);
      doc.circle(x+4, y+4, 4, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.7);
      doc.line(x+4, y+2.5, x+4, y+5.5);
      doc.circle(x+4, y+6.6, 0.45, "F");
    }
    function drawBoxIcon(doc, x, y) {
      doc.setDrawColor(53, 99, 255);
      doc.setLineWidth(0.4);
      doc.rect(x+1, y+2, 6, 6);
      doc.line(x+1, y+4, x+7, y+4);
      doc.line(x+4, y+2, x+4, y+4);
    }

    // ===== PDF export =====
    async function exportToPDF() {
      try {
        await ensurePdfTools();
        const data = buildInventoryReport();
        const jsPDF = getJsPDFCtor();
        const doc = new jsPDF("p", "mm", "a4");

        const PAGE = { left: 14, right: 196, top: 12, width: 210, height: 297 };
        const HEADER_HEIGHT = 24;
        const CONTENT_TOP = HEADER_HEIGHT + 10;

        const ORG = {
          name: "PackPal (Pvt) Ltd",
          address: "No. 42, Elm Street, Colombo",
          email: "hello@packpal.lk",
        };

        const BLUE = [53, 99, 255];
        const BLUE_HEAD = [64, 97, 239];
        const GREY = [110, 119, 129];
        const ORANGE = [244, 143, 64];
        const RED = [231, 76, 60];

        let logoImg = null;
        try {
          const img = new Image();
          img.src = "/new logo.png";
          await img.decode();
          logoImg = img;
        } catch {}

        function drawLetterhead(docInstance) {
          const x = PAGE.left;
          const y = PAGE.top;
          const LOGO_W = 18, LOGO_H = 18;

          if (logoImg) docInstance.addImage(logoImg, "PNG", x, y, LOGO_W, LOGO_H);

          const textRightX = PAGE.right;
          const ty = y + 4.5;

          docInstance.setFontSize(14);
          docInstance.setTextColor(25, 25, 25);
          docInstance.setFont(undefined, "bold");
          docInstance.text(ORG.name, textRightX, ty, { align: "right" });

          docInstance.setFontSize(10);
          docInstance.setFont(undefined, "normal");
          docInstance.setTextColor(80, 86, 100);
          docInstance.text(ORG.address, textRightX, ty + 6, { align: "right" });
          docInstance.text(ORG.email,   textRightX, ty + 12, { align: "right" });

          docInstance.setDrawColor(210, 210, 210);
          docInstance.setLineWidth(0.4);
          docInstance.line(PAGE.left, y + HEADER_HEIGHT, PAGE.right, y + HEADER_HEIGHT);
        }

        const headerHook = () => {
          drawLetterhead(doc);
          const pageStr = `Page ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text(pageStr, PAGE.right, PAGE.height - 8, { align: "right" });
        };

        drawLetterhead(doc);

        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, "bold");
        doc.text("Inventory Management Report", PAGE.left + 15, CONTENT_TOP - 10);

        doc.setFontSize(10);
        doc.setTextColor(...GREY);
        doc.setFont(undefined, "normal");
        doc.text(`Generated on ${data.summary.reportDate}`, PAGE.left + 15, CONTENT_TOP - 3);

        const cards = [
          [String(data.summary.totalItems), "TOTAL ITEMS"],
          [data.summary.totalQuantity.toLocaleString(), "TOTAL QUANTITY"],
          [`LKR ${data.summary.totalValue.toLocaleString()}`, "TOTAL VALUE"],
          [String(data.summary.lowStockCount), "LOW STOCK ITEMS", true],
          [`LKR ${Number(data.summary.avgUnitPrice || 0).toFixed(2)}`, "AVG UNIT PRICE"],
          [String(data.summary.fixedSafetyStock), "SAFETY STOCK"],
        ];
        let cx = PAGE.left, cy = CONTENT_TOP + 10;
        const cw = 60, ch = 22, r = 3, gapX = 6, gapY = 6;

        cards.forEach(([num, label, danger], i) => {
          const stroke = danger ? RED : BLUE;
          doc.setDrawColor(...stroke);
          doc.setLineWidth(0.5);
          doc.roundedRect(cx, cy, cw, ch, r, r);
          doc.setFontSize(12);
          doc.setTextColor(...(danger ? RED : BLUE));
          doc.text(num, cx + 4, cy + 9);
          doc.setFontSize(9.5);
          doc.setTextColor(90, 96, 106);
          doc.text(label, cx + 4, cy + 17);

          cx += cw + gapX;
          if ((i + 1) % 3 === 0) {
            cx = PAGE.left;
            cy += ch + gapY;
          }
        });

        // Low stock
        let y = cy + 8;
        drawWarningIcon(doc, PAGE.left, y - 8);
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("Low Stock Alert", PAGE.left + 10, y);
        y += 2;
        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.3);
        doc.line(PAGE.left, y, PAGE.right, y);
        y += 4;

        if (data.lowStockItems.length) {
          doc.autoTable({
            startY: y,
            head: [["ITEM ID", "ITEM NAME", "CURRENT QTY", "REORDER LEVEL", "SHORTAGE", "UNIT PRICE"]],
            body: data.lowStockItems.map((i) => [
              i.id, i.name, i.quantity, i.reorderLevel,
              Math.max(0, i.reorderLevel - i.quantity),
              `LKR ${Number(i.unitPrice).toFixed(2)}`
            ]),
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: RED, textColor: 255, halign: "left" },
            theme: "grid",
            margin: { left: PAGE.left, right: PAGE.left, top: CONTENT_TOP },
            didDrawPage: headerHook,
          });
          y = doc.lastAutoTable.finalY + 18;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.setFont(undefined, "normal");
          doc.text("Great news — no items are currently below their reorder level.", PAGE.left, y);
          y += 18;
        }

        // Complete Inventory
        drawBoxIcon(doc, PAGE.left, y - 8);
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("Complete Inventory", PAGE.left + 10, y);
        y += 2;
        doc.setDrawColor(...BLUE);
        doc.line(PAGE.left, y, PAGE.right, y);
        y += 4;

        doc.autoTable({
          startY: y,
          head: [["ITEM ID", "ITEM NAME", "DESCRIPTION", "QUANTITY", "REORDER LEVEL", "UNIT PRICE", "TOTAL VALUE"]],
          body: data.inventory.map((i) => [
            i.id, i.name, i.description, i.quantity, i.reorderLevel,
            `LKR ${Number(i.unitPrice).toFixed(2)}`,
            `LKR ${i.totalPrice.toLocaleString()}`
          ]),
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: BLUE_HEAD, textColor: 255, halign: "left" },
          theme: "grid",
          margin: { left: PAGE.left, right: PAGE.left, top: CONTENT_TOP },
          columnStyles: { 2: { cellWidth: 52 } },
          didParseCell: function (hook) {
            if (hook.section === "body" && hook.row.index % 2 === 0) {
              hook.cell.styles.fillColor = [247, 248, 255];
            }
          },
          didDrawPage: headerHook,
        });

        doc.save(`inventory_report_${new Date().toISOString().split("T")[0]}.pdf`);
      } catch (err) {
        console.error(err);
        alert("PDF generation failed. Check console for details.");
      }
    }

    function printReport() {
      const src = $("reportContent")?.innerHTML || "";
      const w = window.open("", "_blank");
      const doc = `
        <!DOCTYPE html><html><head><title>Inventory Report</title>
        <meta charset="utf-8"/>
        <style>
          body{font-family:Arial, sans-serif;margin:0;padding:50px;color:#333}
          .report-header{text-align:center;margin-bottom:100px;border-bottom:2px solid #000;padding-bottom:15px}
          .report-title{font-size:24px;margin-bottom:100px}
          .report-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0}
          .report-stat{text-align:center;padding:15px;border:1px solid #333}
          .report-stat-number{font-size:18px;font-weight:bold}
          .report-table{width:100%;border-collapse:collapse;margin:15px 0}
          .report-table th{background:#f0f0f0;padding:8px;text-align:left;border:1px solid #333}
          .report-table td{padding:6px 8px;border:1px solid #333}
          .report-actions{display:none}
          @media print{ @page{ margin:16mm } }
        </style></head><body>${src}</body></html>`;
      w.document.open(); w.document.write(doc); w.document.close(); w.focus(); w.print();
    }

    function downloadJSON() {
      const data = buildInventoryReport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = `inventory_report_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlObj);
    }

    window.__inv_exportToPDF = exportToPDF;
    window.__inv_printReport  = printReport;
    window.__inv_downloadJSON = downloadJSON;

    // ===== Listeners =====
    const addBtn = $("addBtn");
    const cancelBtn = $("cancelBtn");
    const clearBtn = $("clearBtn");
    const searchInput = $("searchInput");
    const avg = $("avgDailyUsage");
    const lead = $("leadTimeDays");
    const form = $("itemForm");

    const nameInput  = $("itemName");
    const qtyInput   = $("quantity");
    const priceInput = $("unitPrice");
    const avgInput   = avg;
    const leadInput  = lead;

    function validateNameField() {
      if (!nameInput) return true;
      const clean = (nameInput.value || "").trim();
      const ok = /^[A-Za-z ]+$/.test(clean) && clean.length > 0;
      if (!ok) {
        nameInput.setCustomValidity("Item Name must contain only letters and spaces.");
      } else {
        nameInput.setCustomValidity("");
      }
      return ok;
    }

    function validateQuantityField() {
      if (!qtyInput) return true;
      const n = parseInt(qtyInput.value, 10);
      const ok = Number.isInteger(n) && n > 0;
      if (!ok) {
        qtyInput.setCustomValidity("Quantity must be a positive whole number (greater than 0).");
      } else {
        qtyInput.setCustomValidity("");
      }
      return ok;
    }

    function sanitizeNameOnInput() {
      if (!nameInput) return;
      const v = nameInput.value;
      const fixed = v.replace(/[^A-Za-z ]+/g, " ").replace(/\s{2,}/g, " ").trimStart();
      if (fixed !== v) nameInput.value = fixed;
      validateNameField();
    }

    function preventInvalidNumberKeys(e, { allowDot }) {
      const bad = new Set(["e", "E", "+", "-"]);
      if (!allowDot) bad.add(".");
      if (bad.has(e.key)) e.preventDefault();
    }
    function sanitizePasteToDigits(e) {
      const txtRaw = (e.clipboardData?.getData("text") ?? "");
      let txt = txtRaw.replace(/[^\d]/g, "");
      txt = txt.replace(/^0+/, "");
      if (txt !== "") {
        e.preventDefault();
        e.target.value = txt;
        validateQuantityField();
      }
    }
    function sanitizePasteToDecimal(e) {
      let txt = (e.clipboardData?.getData("text") ?? "");
      txt = txt.replace(/[^\d.]/g, "");
      const parts = txt.split(".");
      if (parts.length > 2) txt = parts[0] + "." + parts.slice(1).join("");
      if (txt !== "") {
        e.preventDefault();
        e.target.value = txt;
      }
    }

    function onAdd() {
      resetForm();
      showInlineForm(true);
      $("inlineForm")?.scrollIntoView({ behavior: "smooth" });
    }
    function onCancel() { showInlineForm(false); resetForm(); }
    function onClear()  { resetForm(); }
    function onAvg()    { updateRopPreview(); }
    function onLead()   { updateRopPreview(); }

    // ====== Search by Item ID only ======
    function onSearch(e) {
      const termRaw = (e.target.value || "").trim();
      const term = termRaw.toLowerCase();

      const inventory = inventoryRef.current;

      // Substring match on ID (for exact match, change to ===)
      const filtered = term
        ? inventory.filter((i) => String(i.id).toLowerCase().includes(term))
        : inventory;

      const mapped = filtered.map((item) => ({ item, index: inventory.indexOf(item) }));
      const tbody = $("inventoryBody");
      if (!tbody) return;
      tbody.innerHTML = "";

      mapped.forEach(({ item, index }) => {
        const rop = computeReorderLevel(item);
        const tr = document.createElement("tr");
        if (toNum(item.quantity) <= rop) tr.classList.add("low-stock");
        tr.innerHTML = `
          <td class="item-id">${item.id}</td>
          <td class="item-name">${item.name}</td>
          <td>${item.description}</td>
          <td class="quantity">${item.quantity}</td>
          <td class="reorder-level">${rop}</td>
          <td class="unit-price">LKR ${Number(toNum(item.unitPrice)).toFixed(2)}</td>
          <td class="price">${asLKR(toNum(item.unitPrice)*toNum(item.quantity))}</td>
          <td>
            <div class="action-cell">
              <button class="btn-edit"   onclick="window.__inv_editItem(${index})">Edit</button>
              <button class="btn-delete" onclick="window.__inv_deleteItem(${index})">Delete</button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });

      updateStats();
    }

    async function onSubmit(e) {
      e.preventDefault();

      if (!validateNameField()) { nameInput?.reportValidity(); return; }
      if (!validateQuantityField()) { qtyInput?.reportValidity(); return; }

      const data = {
        id: $("itemId").value.trim(),
        name: $("itemName").value.trim(),
        description: $("description").value.trim(),
        quantity: parseInt($("quantity").value, 10) || 0,
        unitPrice: parseFloat($("unitPrice").value) || 0,
        avgDailyUsage: parseInt($("avgDailyUsage").value, 10) || 0,
        leadTimeDays: parseInt($("leadTimeDays").value, 10) || 0,
        // reorderAdj is NOT edited here; maintained by other flows
      };

      if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
        alert("Quantity must be a positive whole number (greater than 0).");
        $("quantity")?.focus();
        return;
      }
      if (!Number.isInteger(data.avgDailyUsage) || data.avgDailyUsage < 0) {
        alert("Avg Daily Usage must be a non-negative whole number.");
        $("avgDailyUsage")?.focus();
        return;
      }
      if (!Number.isInteger(data.leadTimeDays) || data.leadTimeDays < 0) {
        alert("Lead Time must be a non-negative whole number.");
        $("leadTimeDays")?.focus();
        return;
      }
      if (!Number.isFinite(data.unitPrice) || data.unitPrice < 0) {
        alert("Unit Price must be a non-negative number.");
        $("unitPrice")?.focus();
        return;
      }

      const list = inventoryRef.current;
      const dupIndex = list.findIndex((i) => i.id === data.id && editingIndexRef.current !== list.indexOf(i));
      if (dupIndex !== -1) { alert(`Item ID ${data.id} already exists.`); return; }

      try {
        if (editingIndexRef.current === -1) await apiInv.create(data);
        else await apiInv.update(list[editingIndexRef.current].id, data);

        const res = await apiInv.list();
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        inventoryRef.current = items.map((it) => ({
          id: String(it.id ?? it._id ?? ""),
          name: it.name ?? "",
          description: it.description ?? "",
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          avgDailyUsage: Number(it.avgDailyUsage ?? 0),
          leadTimeDays: Number(it.leadTimeDays ?? 0),
          reorderAdj: Number(it.reorderAdj ?? 0),
        }));

        renderTable();
        resetForm();
        showInlineForm(false);
      } catch (err) {
        console.error("SAVE ERROR:", err?.toJSON?.() || err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.statusText ||
          err?.message ||
          "Save failed";
        alert(`Save failed: ${msg}`);
      }
    }

    // attach
    addBtn?.addEventListener("click", onAdd);
    cancelBtn?.addEventListener("click", onCancel);
    clearBtn?.addEventListener("click", onClear);
    avg?.addEventListener("input", onAvg);
    lead?.addEventListener("input", onLead);
    searchInput?.addEventListener("input", onSearch);
    form?.addEventListener("submit", onSubmit);

    // validation listeners
    nameInput?.addEventListener("input", sanitizeNameOnInput);

    // Quantity
    qtyInput?.addEventListener("keydown", (e) => {
      preventInvalidNumberKeys(e, { allowDot: false });
      if (e.key === "0" && (e.target.value === "" || e.target.selectionStart === 0)) {
        e.preventDefault();
      }
    });
    qtyInput?.addEventListener("input", () => {
      if (qtyInput.value) qtyInput.value = qtyInput.value.replace(/^0+/, "");
      validateQuantityField();
    });
    qtyInput?.addEventListener("paste", sanitizePasteToDigits);
    qtyInput?.addEventListener("blur", () => {
      const n = parseInt(qtyInput.value, 10);
      if (!Number.isInteger(n) || n <= 0) qtyInput.value = "";
      validateQuantityField();
    });

    // Unit Price
    priceInput?.addEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: true }));
    priceInput?.addEventListener("paste", sanitizePasteToDecimal);
    priceInput?.addEventListener("blur", () => {
      if (!priceInput) return;
      const v = priceInput.value.trim();
      const ok = /^(\d+(\.\d*)?|\.\d+)$/.test(v);
      if (!ok) priceInput.value = v.replace(/[^\d.]/g, "");
    });

    // Avg Daily Usage
    avgInput?.addEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: false }));
    avgInput?.addEventListener("paste", sanitizePasteToDigits);
    avgInput?.addEventListener("blur", () => { if (avgInput) avgInput.value = (avgInput.value || "").replace(/[^\d]/g, ""); });

    // Lead Time
    leadInput?.addEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: false }));
    leadInput?.addEventListener("paste", sanitizePasteToDigits);
    leadInput?.addEventListener("blur", () => { if (leadInput) leadInput.value = (leadInput.value || "").replace(/[^\d]/g, ""); });

    // modal close by outside click
    function clickHandler(e) {
      const m = $("reportModal");
      if (e.target === m) closeReportModal();
    }
    window.addEventListener("click", clickHandler);

    // initial render
    showInlineForm(false);
    renderTable();

    // load from backend
    async function loadFromBackend() {
      try {
        const res = await apiInv.list();
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        inventoryRef.current = items.map((it) => ({
          id: String(it.id ?? it._id ?? ""),
          name: it.name ?? "",
          description: it.description ?? "",
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          avgDailyUsage: Number(it.avgDailyUsage ?? 0),
          leadTimeDays: Number(it.leadTimeDays ?? 0),
          reorderAdj: Number(it.reorderAdj ?? 0),
        }));
        renderTable();
      } catch (err) {
        console.warn("Initial fetch failed (using seed data):", err?.message || err);
      }
    }
    loadFromBackend();

    // cleanup
    return () => {
      addBtn?.removeEventListener("click", onAdd);
      cancelBtn?.removeEventListener("click", onCancel);
      clearBtn?.removeEventListener("click", onClear);
      avg?.removeEventListener("input", onAvg);
      lead?.removeEventListener("input", onLead);
      searchInput?.removeEventListener("input", onSearch);
      form?.removeEventListener("submit", onSubmit);

      nameInput?.removeEventListener("input", sanitizeNameOnInput);

      qtyInput?.removeEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: false }));
      qtyInput?.removeEventListener("paste", sanitizePasteToDigits);

      priceInput?.removeEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: true }));
      priceInput?.removeEventListener("paste", sanitizePasteToDecimal);

      avgInput?.removeEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: false }));
      avgInput?.removeEventListener("paste", sanitizePasteToDigits);

      leadInput?.removeEventListener("keydown", (e) => preventInvalidNumberKeys(e, { allowDot: false }));
      leadInput?.removeEventListener("paste", sanitizePasteToDigits);

      window.removeEventListener("click", clickHandler);

      delete window.__inv_editItem;
      delete window.__inv_deleteItem;
      delete window.__inv_exportToPDF;
      delete window.__inv_printReport;
      delete window.__inv_downloadJSON;
      delete window.__inv_generateReport;
    };
  }, []);

  return (
    <div className="page-shell ii">
      <Sidebarpul />
      <div className="main-content">
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1>Item Inventory</h1>
            <div className="search">
              {/* ID-only search UX hint */}
              <input
                id="searchInput"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                placeholder=" 🔍 Search by Item ID..."
                title="Type an Item ID"
              />
            </div>
            <button className="add-btn" id="addBtn">Add New Item</button>
          </div>

          {/* Inline Add/Edit Form */}
          <div id="inlineForm" className="form-card">
            <div className="form-header">
              <div>
                <div className="form-title" id="formTitle">Add New Item</div>
                <div className="hint">
                  Reorder Level = <b>Avg Daily Usage × Lead Time</b> + <b>Safety Stock (20)</b> + <b>Dynamic Adj</b>.
                  <br/>Dynamic Adj changes automatically when stock is deducted (Hiru) or delivered (Purchases).
                  <br/><br/><b>Total price</b> is calculated automatically.
                </div>
              </div>
              <button className="btn btn-light" id="cancelBtn" type="button">Cancel</button>
            </div>

            <form id="itemForm">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="itemId">Item ID</label>
                  <input id="itemId" required />
                </div>
                <div className="form-group">
                  <label htmlFor="itemName">Item Name</label>
                  <input
                    id="itemName"
                    required
                    pattern="[A-Za-z ]+"
                    title="Only letters and spaces are allowed"
                    onInvalid={(e) => e.target.setCustomValidity("Item Name must contain only letters and spaces.")}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <input id="description" required />
                </div>
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                    onInvalid={(e) => e.target.setCustomValidity("Quantity must be greater than 0")}
                    onInput={(e) => e.target.setCustomValidity("")}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="avgDailyUsage">Avg Daily Usage</label>
                  <input
                    id="avgDailyUsage"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    defaultValue="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="leadTimeDays">Lead Time (days)</label>
                  <input
                    id="leadTimeDays"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    defaultValue="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="safetyStock">Safety Stock (fixed)</label>
                  <input id="safetyStock" type="number" defaultValue="20" disabled style={{ background: "#f3f4f6", cursor: "not-allowed" }} title="Safety Stock is fixed at 20" />
                </div>

                <div className="form-group">
                  <label htmlFor="reorderLevel">Reorder Level (auto)</label>
                  <input id="reorderLevel" type="number" min="0" readOnly style={{ background: "#f9fafb" }} />
                </div>

                <div className="form-group">
                  <label htmlFor="unitPrice">Unit Price</label>
                  <input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-pri">Save Item</button>
                <button type="button" className="btn btn-light" id="clearBtn">Clear</button>
              </div>
            </form>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="metric-card">
              <div className="stat-number" style={{ color: "#ffffffff" }} id="totalItems">0</div>
              <div className="stat">Total Items</div>
            </div>
            <div className="metric-card">
              <div className="stat-number" style={{ color: "#ca1c09ff" }} id="lowStockItems">0</div>
              <div className="stat">Low Stock Items</div>
            </div>
            <div className="metric-card">
              <div className="stat-number" style={{ color: "#ffffffff" }} id="totalValue">LKR 0</div>
              <div className="stat">Total Inventory Value</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table id="inventoryTable">
              <thead>
                <tr>
                  <th>ITEM ID</th>
                  <th>ITEM NAME</th>
                  <th>DESCRIPTION</th>
                  <th>QUANTITY</th>
                  <th>REORDER LEVEL</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="inventoryBody"></tbody>
            </table>
          </div>

          {/* Generate report */}
          <div className="report-section">
            <button
              className="generate-repo-btn"
              onClick={() => window.__inv_generateReport && window.__inv_generateReport()}
            >
              📊 Generate Report
            </button>
          </div>
        </div>

        {/* Report Modal */}
        <div id="reportModal" className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => { const el = document.getElementById("reportModal"); if (el) el.style.display = "none"; }}>
              &times;
            </span>
            <div id="reportContent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
