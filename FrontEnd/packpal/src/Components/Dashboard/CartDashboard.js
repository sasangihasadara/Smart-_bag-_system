import React, { useEffect, useMemo, useState } from "react";     
import "./CartDashboard.css";
import Sidebarsa from "../Sidebar/Sidebarsa";
import TransactionsTable from "../TransactionsTable/TransactionsTable";
import { api } from "../../lib/api"; // <-- use your shared axios instance

const money = (n) =>
  "LKR" +
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const unpackList = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.transactions ??
      payload?.products ??
      payload?.items ??
      payload?.data ??
      [];

/* ---------- Normalizers ---------- */
const toProduct = (row) => ({
  id: String(
    row?.id ?? row?._id ?? row?.productId ?? Math.random().toString(36).slice(2, 10)
  ),
  name: row?.name ?? "Unnamed",
  price: Number(row?.price ?? 0),
  discountType: row?.discountType ?? "none", // "percentage" | "fixed" | "none"
  discountValue: Number(row?.discountValue ?? 0),
});

const toTx = (row) => ({
  id: String(
    row?.id ??
      row?._id ??
      row?.txId ??
      row?.transactionId ??
      Math.random().toString(36).slice(2, 10)
  ),
  date: row?.date ? String(row.date).slice(0, 10) : "",
  customer: row?.customer ?? "",
  fmc: Boolean(row?.fmc),
  productName: row?.productName ?? row?.product?.name ?? "",
  qty: Number(row?.qty ?? 1),
  unitPrice: Number(row?.unitPrice ?? 0),
  discountPerUnit: Number(row?.discountPerUnit ?? 0),
  total: Number(row?.total ?? 0),
  method: row?.method ?? "Card",
  status: row?.status ?? "Paid",
});

/* ---------- Robust fetchers with fallbacks ---------- */
async function getWithFallbacks(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p);
      // eslint-disable-next-line no-console
      console.log("[CartDashboard] Fetched:", p);
      return res.data;
    } catch (e) {
      lastErr = e;
      // eslint-disable-next-line no-console
      console.warn("[CartDashboard] Failed:", p, e?.response?.status || e.message);
    }
  }
  throw lastErr || new Error("All endpoints failed");
}

const fetchHandler = {
  getProducts: async () => {
    // Try the typical mounts in order
    const data = await getWithFallbacks([
      "/carts",
      "/api/carts",
      "/api/products",
      "/products",
    ]);
    return unpackList(data).map(toProduct);
  },
  getTransactions: async () => {
    const data = await getWithFallbacks([
      "/transactions",
      "/api/transactions",
    ]);
    return unpackList(data).map(toTx);
  },
};

/* ---------- Helpers ---------- */
function discountFromProduct(prod) {
  if (!prod) return 0;
  const price = Number(prod.price || 0);
  const dv = Number(prod.discountValue || 0);
  if (prod.discountType === "percentage") return Math.max(0, price * (dv / 100));
  if (prod.discountType === "fixed") return Math.max(0, dv);
  return 0;
}

export default function CartDashboard() {
  const [products, setProducts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      setLoading(true);
      setErr("");
      try {
        const [p, t] = await Promise.all([
          fetchHandler.getProducts(),
          fetchHandler.getTransactions(),
        ]);
        if (!mounted) return;
        setProducts(p);
        setTxs(t);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();

    // optional: reload on focus or custom events
    const onTxChanged = () => loadAll();
    const onProductsChanged = () => loadAll();
    const onFocus = () => loadAll();
    window.addEventListener("tx:changed", onTxChanged);
    window.addEventListener("products:changed", onProductsChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.removeEventListener("tx:changed", onTxChanged);
      window.removeEventListener("products:changed", onProductsChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  /* ---------- KPIs + Recent with derived discount ---------- */
  const { productsCount, activeDiscounts, totalPaid, totalPending, recent } =
    useMemo(() => {
      const p = Array.isArray(products) ? products : [];
      const t = Array.isArray(txs) ? txs : [];

      // quick lookup by product name
      const productByName = Object.fromEntries(
        p.map((pr) => [String(pr.name).toLowerCase(), pr])
      );

      // enrich each tx with discountPerUnit / unitPrice / total if missing
      const enriched = t.map((row) => {
        const prod =
          productByName[String(row.productName || "").toLowerCase()] || null;

        const perDisc =
          Number(row.discountPerUnit || 0) || discountFromProduct(prod);

        const basePrice = Number(row.unitPrice || 0) || Number(prod?.price || 0);
        const finalUnit = basePrice > 0 ? Math.max(0, basePrice - perDisc) : 0;

        const qty = Number(row.qty || 1);
        const finalTotal =
          Number(row.total || 0) || Math.max(0, finalUnit * qty);

        return {
          ...row,
          discountPerUnit: perDisc,
          unitPrice: finalUnit,
          total: finalTotal,
        };
      });

      const productsCount = p.length;
      const activeDiscounts = p.filter(
        (x) =>
          (x?.discountType ?? "none") !== "none" &&
          Number(x?.discountValue ?? 0) > 0
      ).length;

      const paidRows = enriched.filter(
        (r) => (r?.status || "Paid").toLowerCase() === "paid"
      );
      const pendRows = enriched.filter(
        (r) => (r?.status || "").toLowerCase() === "pending"
      );

      const totalPaid = paidRows.reduce((s, r) => s + (Number(r?.total) || 0), 0);
      const totalPending = pendRows.reduce((s, r) => s + (Number(r?.total) || 0), 0);

      const recent = [...enriched]
        .sort(
          (a, b) =>
            String(b.date).localeCompare(String(a.date)) ||
            String(b.id).localeCompare(String(a.id))
        )
        .slice(0, 10);

      return { productsCount, activeDiscounts, totalPaid, totalPending, recent };
    }, [products, txs]);

  const recentWithSeq = useMemo(
    () =>
      recent.map((t, i) => ({
        ...t,
        txId: t.id,
        id: String(i + 1),
        discount: t.discountPerUnit,
      })),
    [recent]
  );

  return (
    <div className="page-wrap cart-page">
      <Sidebarsa />

      {/* Main content (right) */}
      <main className="cart-main">
        <header className="dash-header">
          <h1>Dashboard</h1>
          <p className="muted">Overview of inventory, discounts, and finance.</p>
        </header>

        {loading && <div className="muted">Loading…</div>}
        {err && (
          <div className="error" style={{ color: "#b91c1c", marginBottom: 12 }}>
            {err}
          </div>
        )}

        <div className="stats">
          <div className="card stat">
            <div className="v">{productsCount}</div>
            <div className="l">Products</div>
          </div>
          <div className="card stat">
            <div className="v">{activeDiscounts}</div>
            <div className="l">Active Discounts</div>
          </div>
          <div className="card stat">
            <div className="v">{money(totalPaid)}</div>
            <div className="l">Total Sales (Paid)</div>
          </div>
          <div className="card stat">
            <div className="v">{money(totalPending)}</div>
            <div className="l">Pending Invoices</div>
          </div>
        </div>

        <section className="section">
          <div className="head">
            <h3>Recent Transactions</h3>
          </div>
          <TransactionsTable
            rows={recentWithSeq}
            limit={10}
            showActions={false}
            showFMC={false}
            showStatus={false}
            useSequentialIds={true}
          />
        </section>
      </main>
    </div>
  );
}
