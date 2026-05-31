import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Discounts.css";
import Sidebarsa from "../Sidebar/Sidebarsa";

/* ===== ONE PLACE TO EDIT ===== */
const URL = "http://localhost:5000/api/carts";

/* ===== Helpers ===== */
const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pct = (n) => `${Number(n || 0).toFixed(0)}%`;

const effectivePrice = (p) => {
  if (p.discountType === "percentage")
    return Math.max(0, Number(p.price) * (1 - (Number(p.discountValue) || 0) / 100));
  if (p.discountType === "fixed")
    return Math.max(0, Number(p.price) - (Number(p.discountValue) || 0));
  return Number(p.price || 0);
};
const saving = (p) => Math.max(0, Number(p.price || 0) - effectivePrice(p));

const toUI = (row) => ({
  id: String(
    row?.id ?? row?._id ?? row?.productId ?? Math.random().toString(36).slice(2, 10)
  ),
  name: row?.name ?? "Unnamed",
  category: row?.category ?? "",
  img: row?.img ?? "",
  price: Number(row?.price ?? 0),
  stock: Number(row?.stock ?? 0),
  rating: Number(row?.rating ?? 0),
  discountType: row?.discountType ?? "none",
  discountValue: Number(row?.discountValue ?? 0),
});

// Accept array or common wrappers {products|items|data}
const unpackList = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.products ?? payload?.items ?? payload?.data ?? [];

/* ===== fetchHandler (axios) ===== */
const fetchHandler = async () => {
  const res = await axios.get(URL);
  return res.data; // may be array or wrapped object
};

export default function DiscountsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ productId: "", type: "none", value: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId) || null,
    [products, form.productId]
  );

  /* ---------------- Validation ---------------- */
  function validate(nextForm = form) {
    const e = {};
    if (!nextForm.productId) e.productId = "Please select a product.";
    if (!nextForm.type || nextForm.type === "none")
      e.type = "Choose Percentage or Fixed.";
    if (nextForm.type !== "none") {
      if (nextForm.value === "" || nextForm.value === null)
        e.value = "Enter a discount value.";
      else if (!Number.isFinite(Number(nextForm.value)))
        e.value = "Value must be a number.";
      else if (Number(nextForm.value) < 0)
        e.value = "Value must be 0 or greater.";
      else if (
        nextForm.type === "percentage" &&
        (Number(nextForm.value) > 90 || Number(nextForm.value) < 0)
      )
        e.value = "Percentage must be between 0 and 90.";
      else if (
        nextForm.type === "fixed" &&
        selectedProduct &&
        Number(nextForm.value) > Number(selectedProduct.price)
      )
        e.value = "Fixed discount cannot exceed product price.";
    }
    setErrors(e);
    return e;
  }

  useEffect(() => {
    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId, form.type, form.value, selectedProduct?.price]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  /* ---------------- Data loading ---------------- */
  const loadProducts = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchHandler();
      setProducts(unpackList(data).map(toUI));
    } catch (e) {
      const msg =
        e?.response?.status === 404
          ? `404 Not Found: ${URL} — check your backend route`
          : e?.response?.data?.message || e.message || "Failed to load";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const discounted = useMemo(
    () =>
      products.filter(
        (p) => p.discountType !== "none" && (p.discountValue || 0) > 0
      ),
    [products]
  );

  /* ---------------- Actions ---------------- */
  const applyDiscount = async () => {
    const e = validate();
    if (Object.keys(e).length) return;

    const prod = selectedProduct;
    if (!prod) return;

    const payload = {
      ...prod,
      discountType: form.type,
      discountValue: Number(form.value),
    };

    try {
      await axios.put(`${URL}/${prod.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      await loadProducts();
      setForm((f) => ({ ...f, value: "" }));
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to apply discount");
    }
  };

  const clearDiscount = async () => {
    if (!form.productId) {
      setErrors({ productId: "Please select a product." });
      return;
    }
    const prod = selectedProduct;
    if (!prod) return;

    const payload = { ...prod, discountType: "none", discountValue: 0 };

    try {
      await axios.put(`${URL}/${prod.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      await loadProducts();
      setForm((f) => ({ productId: prod.id, type: "none", value: "" }));
      setErrors({});
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Failed to clear discount");
    }
  };

  /* ---------------- Render ---------------- */
  return (
    /* === PAGE WRAP START === */
    <div className="page-wrap discounts-page">
      {/* Left: Sidebar */}
      <Sidebarsa />

      {/* Right: Main column */}
      <main className="discounts-main">
        <div className="container">
          <h1 className="page-title">Discounts</h1>
          <p className="muted">Create and manage product price discounts.</p>

          {loading && <div className="muted">Loading…</div>}
          {err && (
            <div className="error" style={{ color: "#b91c1c", marginBottom: 8 }}>
              {err}
            </div>
          )}

          {/* Create / Update */}
          <section className="section">
            <div className="head">
              <h3>Create / Update Product Discounts</h3>
              <div className="actions">
                <button className="btn" onClick={loadProducts}>Reload</button>
              </div>
            </div>
            <div className="body">
              <div className="form-wrapper">
                <div className="grid grid-3">
                  {/* Select Product */}
                  <div>
                    <label>
                      Select Product{" "}
                      {errors.productId && (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                          • {errors.productId}
                        </span>
                      )}
                    </label>
                    <select
                      className={errors.productId ? "invalid" : ""}
                      value={form.productId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, productId: e.target.value }))
                      }
                    >
                      <option value="">Select a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {money(effectivePrice(p))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label>
                      Discount Type{" "}
                      {errors.type && (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                          • {errors.type}
                        </span>
                      )}
                    </label>
                    <select
                      className={errors.type ? "invalid" : ""}
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (LKR)</option>
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label>
                      Discount Value{" "}
                      {errors.value && (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                          • {errors.value}
                        </span>
                      )}
                    </label>
                    <input
                      className={errors.value ? "invalid" : ""}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={form.type === "percentage" ? "0–90" : "≤ price in LKR"}
                      value={form.value}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, value: e.target.value }))
                      }
                      disabled={form.type === "none"}
                    />
                    {selectedProduct && form.type === "fixed" && (
                      <small className="muted">Max: {money(selectedProduct.price)}</small>
                    )}
                    {form.type === "percentage" && (
                      <small className="muted">Allowed: 0–90%</small>
                    )}
                  </div>
                </div>
              </div>

              <div className="actions" style={{ marginTop: 12, justifyContent: "flex-start", gap: 8 }}>
                <button
                  className="btn green"
                  onClick={applyDiscount}
                  disabled={!isValid || loading}
                  title={!isValid ? "Fix validation errors" : ""}
                >
                  Apply Discount
                </button>
                <button
                  className="btn red"
                  onClick={clearDiscount}
                  disabled={!form.productId || loading}
                >
                  Clear Discount
                </button>
              </div>
            </div>
          </section>

          {/* Active Discounts */}
          <section className="section">
            <div className="head"><h3>Active Discounts</h3></div>
            <div className="body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>PRODUCT</th>
                    <th className="right">BASE PRICE</th>
                    <th>TYPE</th>
                    <th className="right">VALUE</th>
                    <th className="right">NEW PRICE</th>
                    <th className="right">YOU SAVE</th>
                  </tr>
                </thead>
                <tbody>
                  {discounted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">No active discounts</td>
                    </tr>
                  )}
                  {discounted.map((p, i) => {
                    const ep = effectivePrice(p);
                    const sv = saving(p);
                    return (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td>{p.name}</td>
                        <td className="right">{money(p.price)}</td>
                        <td>{p.discountType === "percentage" ? "Percentage" : "Fixed"}</td>
                        <td className="right">
                          {p.discountType === "percentage" ? pct(p.discountValue) : money(p.discountValue)}
                        </td>
                        <td className="right">{money(ep)}</td>
                        <td className="right">{money(sv)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* tiny inline style for invalid fields if your CSS doesn't have it */}
          <style>{`.invalid { border-color: #ef4444 !important; outline: none; }`}</style>
        </div>
      </main>
    </div>
    /* === PAGE WRAP END === */
  );
}
