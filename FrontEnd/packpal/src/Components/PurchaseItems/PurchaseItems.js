// src/Components/PurchaseItems/PurchaseItems.js
import React, { useEffect, useRef } from "react";
import Sidebarpul from "../Sidebar/Sidebarpul";
import "./PurchaseItems.css";
import { purchases } from "../../lib/purchases";

export default function PurchaseItems() {
  const suppliersRef = useRef([
    { name: "Premium Leather Co." },
    { name: "Canvas Works Ltd." },
    { name: "Artisan Crafts Inc." },
    { name: "Modern Bag Solutions" },
    { name: "Ceylon Leather Crafts (Pvt) Ltd." },
    { name: "Precision Accessories" },
  ]);
  const purchaseOrdersRef = useRef([]);

  useEffect(() => {
    const fmt = (d) =>
      new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

    /* ---------- populate supplier dropdown ---------- */
    const populateSuppliers = () => {
      const sel = document.getElementById("modalSupplier");
      if (!sel) return;
      sel.innerHTML =
        '<option value="">Select Supplier</option>' +
        suppliersRef.current.map((s) => `<option>${s.name}</option>`).join("");
    };

    /* ---------- KPI refresh ---------- */
    const refreshMetrics = () => {
      const list = purchaseOrdersRef.current;
      const pending = list.filter((o) => o.status === "pending").length;
      const completed = list.filter((o) =>
        ["approved", "delivered"].includes(o.status)
      ).length;
      const setText = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };
      setText("poPending", pending);
      setText("poCompleted", completed);
      const dateEl = document.getElementById("poDate");
      if (dateEl) dateEl.textContent = "Last Updated: " + new Date().toLocaleString();
    };

    /* ---------- table render ---------- */
    const renderTable = () => {
      const tbody = document.getElementById("purchaseTableBody");
      if (!tbody) return;
      tbody.innerHTML = "";
      purchaseOrdersRef.current.forEach((o) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${o.id}</strong></td>
          <td>${o.supplier}</td>
          <td>${o.itemId || "-"}</td>
          <td>${o.itemName || "-"}</td>
          <td>${o.quantity ?? "-"}</td>
          <td>${fmt(o.orderDate)}</td>
          <td>${o.deliveryDate ? fmt(o.deliveryDate) : "-"}</td>
          <td><span class="status ${o.status}">${o.status}</span></td>
          <td class="actions">
            <button class="btn btn-ed" data-action="view" data-id="${o.id}">View</button>
            ${
              o.status === "pending"
                ? `<button class="btn btn-suc" data-action="approve" data-id="${o.id}">Approve</button>`
                : ""
            }
            <button class="btn btn-sec" data-action="edit" data-id="${o.id}">Edit</button>
            <button class="btn btn-danger" data-action="delete" data-id="${o.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    /* ---------- data load ---------- */
    async function loadOrders() {
      try {
        const res = await purchases.list();
        const rows = Array.isArray(res?.data?.orders) ? res.data.orders : [];
        purchaseOrdersRef.current = rows.map((o) => ({
          id: o.id,
          supplier: o.supplier,
          itemId: o.itemId || "",
          itemName: o.itemName || "",
          quantity: Number(o.quantity ?? 0),
          orderDate: o.orderDate
            ? String(o.orderDate).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          deliveryDate: o.deliveryDate ? String(o.deliveryDate).slice(0, 10) : "",
          status: o.status || "pending",
          priority: o.priority || "normal",
          notes: o.notes || "",
        }));
        renderTable();
        refreshMetrics();
      } catch (e) {
        console.warn("Failed to load purchases:", e?.message || e);
      }
    }

    /* ---------- PDF export (lazy) ---------- */
    const exportPDF = async () => {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF("p", "pt");
      const orders = purchaseOrdersRef.current;

      doc.setFontSize(20);
      doc.text("PackPal — Purchase Orders", 40, 40);
      doc.setDrawColor(60, 80, 240);
      doc.setLineWidth(2);
      doc.line(40, 48, 555, 48);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text("Generated on " + new Date().toLocaleString(), 40, 66);

      autoTable(doc, {
        startY: 90,
        head: [["ORDER ID", "SUPPLIER", "ITEM ID", "ITEM NAME", "QTY", "ORDER DATE", "DELIVERY", "STATUS"]],
        body: orders.map((o) => [
          o.id,
          o.supplier,
          o.itemId,
          o.itemName,
          String(o.quantity ?? ""),
          o.orderDate,
          o.deliveryDate || "-",
          o.status.toUpperCase(),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [237, 242, 255], textColor: 30, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { cellWidth: 120 } },
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(str, 555, 820, { align: "right" });
        },
      });
      doc.save("PurchaseOrders.pdf");
    };

    /* ---------- CRUD helpers ---------- */
    const openCreateModal = () => {
      populateSuppliers();
      document.getElementById("poEditId").value = "";
      document.getElementById("purchaseForm").reset();
      document.getElementById("poModalTitle").textContent = "Create New Purchase Order";
      document.getElementById("poSubmitBtn").textContent = "Create Order";
      const d = new Date(); d.setDate(d.getDate() + 14);
      const del = document.getElementById("modalDelivery");
      if (del) del.value = d.toISOString().split("T")[0];
      const m = document.getElementById("purchaseModal");
      m?.classList.add("show"); m?.setAttribute("aria-hidden", "false");
    };

    const openEditModal = (order) => {
      populateSuppliers();
      document.getElementById("poEditId").value = order.id;
      document.getElementById("modalSupplier").value = order.supplier || "";
      document.getElementById("modalItemId").value = order.itemId || "";
      document.getElementById("modalItemName").value = order.itemName || "";
      document.getElementById("modalQuantity").value = order.quantity ?? "";
      document.getElementById("modalDelivery").value = order.deliveryDate || "";
      document.getElementById("modalPriority").value = order.priority || "normal";
      document.getElementById("poModalTitle").textContent = "Edit Purchase Order";
      document.getElementById("poSubmitBtn").textContent = "Update";
      const m = document.getElementById("purchaseModal");
      m?.classList.add("show"); m?.setAttribute("aria-hidden", "false");
    };

    const closeModal = () => {
      const m = document.getElementById("purchaseModal");
      m?.classList.remove("show"); m?.setAttribute("aria-hidden", "true");
    };

    const viewOrder = (id) => {
      const o = purchaseOrdersRef.current.find((x) => x.id === id);
      if (!o) return;
      alert(
        `Order Details:
ID: ${o.id}
Supplier: ${o.supplier}
Item ID: ${o.itemId}
Item Name: ${o.itemName}
Quantity: ${o.quantity}
Status: ${o.status}
Order Date: ${fmt(o.orderDate)}
Delivery: ${o.deliveryDate ? fmt(o.deliveryDate) : "-"}`
      );
    };

    const approveOrder = async (id) => {
      const o = purchaseOrdersRef.current.find((x) => x.id === id);
      if (!o) return;
      try {
        if (window.confirm("Approve this order?")) {
          o.status = "approved"; // optimistic
          renderTable(); refreshMetrics();
          await purchases.setStatus(id, "approved");
        }
      } catch (e) {
        o.status = "pending"; renderTable(); refreshMetrics();
        alert("Approve failed: " + (e?.response?.data?.message || e?.message || "Network Error"));
      } finally {
        await loadOrders();
      }
    };

    const deleteOrder = async (id) => {
      if (!window.confirm(`Delete order ${id}?`)) return;
      try {
        await purchases.remove(id);
        await loadOrders();
      } catch (e) {
        alert("Delete failed: " + (e?.response?.data?.message || e?.message || "Network Error"));
      }
    };

    const editOrder = (id) => {
      const o = purchaseOrdersRef.current.find((x) => x.id === id);
      if (!o) return;
      openEditModal(o);
    };

    /* ---------- submit ---------- */
    const onFormSubmit = async (e) => {
      e.preventDefault();
      const editId = document.getElementById("poEditId").value;
      const data = {
        supplier: document.getElementById("modalSupplier").value,
        itemId: document.getElementById("modalItemId").value.trim(),
        itemName: document.getElementById("modalItemName").value.trim(),
        quantity: parseInt(document.getElementById("modalQuantity").value, 10),
        deliveryDate: document.getElementById("modalDelivery").value || undefined,
        priority: document.getElementById("modalPriority").value || "normal",
        status: "pending",
      };
      if (!data.supplier || !data.itemId || !data.itemName || !Number.isInteger(data.quantity) || data.quantity < 1) {
        alert("Please fill Supplier, Item ID, Item Name and a Quantity ≥ 1");
        return;
      }

      try {
        if (!editId) {
          await purchases.create({ ...data, orderDate: new Date().toISOString().slice(0, 10) });
        } else {
          await purchases.update(editId, data);
        }
        closeModal();
        await loadOrders();
      } catch (e2) {
        alert("Save failed: " + (e2?.response?.data?.message || e2?.message || "Network Error"));
      }
    };

    /* ---------- bulk approve ---------- */
    const onBulkClick = async () => {
      if (!window.confirm("Approve all pending orders?")) return;
      const pending = purchaseOrdersRef.current.filter((o) => o.status === "pending");
      if (!pending.length) return;
      pending.forEach((o) => (o.status = "approved")); // optimistic
      renderTable(); refreshMetrics();
      const results = await Promise.allSettled(pending.map((o) => purchases.setStatus(o.id, "approved")));
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length) alert(`Bulk approve finished with ${rejected.length} error(s).`);
      await loadOrders();
    };

    /* ---------- search & filter ---------- */
    const onSearchInput = () => {
      const q = document.getElementById("purchaseSearch").value.toLowerCase();
      Array.from(document.querySelectorAll("#purchaseTableBody tr")).forEach((r) => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    };
    const onFilterChange = () => {
      const v = document.getElementById("statusFilter").value;
      Array.from(document.querySelectorAll("#purchaseTableBody tr")).forEach((r) => {
        const st = r.querySelector(".status")?.textContent.trim();
        r.style.display = !v || st === v ? "" : "none";
      });
    };

    /* ---------- events ---------- */
    document.getElementById("btnCreate")?.addEventListener("click", openCreateModal);
    document.getElementById("btnExport")?.addEventListener("click", exportPDF);
    document.getElementById("btnBulkApprove")?.addEventListener("click", onBulkClick);
    document.getElementById("purchaseTableBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "view") return viewOrder(id);
      if (action === "approve") return approveOrder(id);
      if (action === "edit") return editOrder(id);
      if (action === "delete") return deleteOrder(id);
    });
    document.getElementById("purchaseForm")?.addEventListener("submit", onFormSubmit);
    document.getElementById("purchaseSearch")?.addEventListener("input", onSearchInput);
    document.getElementById("statusFilter")?.addEventListener("change", onFilterChange);
    document.getElementById("poCloseBtn")?.addEventListener("click", closeModal);
    document.getElementById("btnCancel")?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeModal(); });
    document.addEventListener("click", (ev) => { if (ev.target?.id === "purchaseModal") closeModal(); });

    /* ---------- init ---------- */
    populateSuppliers();
    loadOrders();

    /* ---------- cleanup ---------- */
    return () => {
      document.getElementById("btnCreate")?.removeEventListener("click", openCreateModal);
      document.getElementById("btnExport")?.removeEventListener("click", exportPDF);
      document.getElementById("btnBulkApprove")?.removeEventListener("click", onBulkClick);
      document.getElementById("purchaseTableBody")?.replaceWith(document.getElementById("purchaseTableBody")?.cloneNode(true));
      document.getElementById("purchaseForm")?.removeEventListener("submit", onFormSubmit);
      document.getElementById("purchaseSearch")?.removeEventListener("input", onSearchInput);
      document.getElementById("statusFilter")?.removeEventListener("change", onFilterChange);
      document.getElementById("poCloseBtn")?.removeEventListener("click", closeModal);
      document.getElementById("btnCancel")?.removeEventListener("click", closeModal);
    };
  }, []);

  /* ---------- UI (matches your screenshot) ---------- */
  return (
    <div className="po">
      <Sidebarpul />
      <main className="main-content">
        <div className="container" id="purchase-items">
          <div className="header">
            <h1>🛒 Purchase Orders Management</h1>
            <div className="date" id="poDate"></div>
          </div>

          {/* KPI cards */}
          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-value" id="poPending">0</div>
              <div className="metric-label">Pending Orders</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" id="poCompleted">0</div>
              <div className="metric-label">Completed Orders</div>
            </div>
          </div>

          {/* Action bar */}
          <div className="action-bar">
            <button className="btn btn-pr" id="btnCreate"><span>＋</span>Create New Order</button>
            <button className="btn btn-secondary" id="btnExport"><span>📄</span>Export Orders (PDF)</button>
            <button className="btn btn-success" id="btnBulkApprove"><span>✓</span>Bulk Approve</button>
          </div>

          {/* Table with search & filter to the right */}
          <div className="table-container">
            <div className="table-header">
              <div className="table-title">📋 Purchase Orders</div>
              <div className="search-filter-bar">
                <input type="text" className="search-box" id="purchaseSearch" placeholder="Search orders..." />
                <select className="filter-select" id="statusFilter" defaultValue="">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <table id="purchaseTable">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Supplier</th>
                  <th>Item ID</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="purchaseTableBody"></tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <div className="modal" id="purchaseModal" aria-hidden="true" role="dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title" id="poModalTitle">Create New Purchase Order</h2>
              <button className="close-modal" id="poCloseBtn" aria-label="Close">&times;</button>
            </div>
            <form id="purchaseForm">
              <input type="hidden" id="poEditId" defaultValue="" />
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-control" id="modalSupplier">
                  <option value="">Select Supplier</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Item ID</label>
                <input className="form-control" id="modalItemId" placeholder="Enter item ID from inventory" />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-control" id="modalItemName" placeholder="Enter item name" />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-control" id="modalQuantity" placeholder="Enter quantity" min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Delivery Date</label>
                <input type="date" className="form-control" id="modalDelivery" />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" id="modalPriority">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" id="btnCancel">Cancel</button>
                <button type="submit" className="btn btn-pri" id="poSubmitBtn">Create Order</button>
              </div>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
