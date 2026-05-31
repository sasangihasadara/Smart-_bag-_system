import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProductList.css";
import Sidebarsa from "../Sidebar/Sidebarsa";

/* ===================== ONE PLACE TO EDIT ===================== */
/* If your backend uses a different route, change it here */
const URL = "http://localhost:5000/api/products";

/* ===================== Helpers ===================== */
const money = (n) =>
  "LKR" +
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pct = (n) => `${Number(n || 0).toFixed(0)}%`;

const effectivePrice = (p) => {
  const price = Number(p?.price || 0);
  const dv = Number(p?.discountValue || 0);
  if (p?.discountType === "percentage") return Math.max(0, price * (1 - dv / 100));
  if (p?.discountType === "fixed") return Math.max(0, price - dv);
  return price;
};
const saving = (p) => Math.max(0, Number(p?.price || 0) - effectivePrice(p));

/* Keep BOTH: a stable UI id and the real DB id for API calls */
const toUI = (row, idx) => {
  const realId = String(row?._id ?? row?.id ?? row?.productId ?? "");
  return {
    uiId: String(idx + 1) + "-" + (realId || Math.random().toString(36).slice(2, 10)),
    realId,                                  // <-- use THIS for PUT/DELETE
    name: row?.name ?? "Unnamed",
    category: row?.category ?? "",
    img: row?.img ?? "",
    price: Number(row?.price ?? 0),
    stock: Number(row?.stock ?? 0),
    rating: Number(row?.rating ?? 0),
    discountType: row?.discountType ?? "none",
    discountValue: Number(row?.discountValue ?? 0),
  };
};

const unpackList = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.products ?? payload?.items ?? payload?.data ?? [];

/* ===================== Validation helpers ===================== */
const isAcceptableImageRef = (s) => {
  if (!s) return true;
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("images/")) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const validateProduct = (f) => {
  const errs = {};
  const name = String(f.name || "").trim();
  const category = String(f.category || "").trim();
  const img = String(f.img || "").trim();
  const price = Number(f.price);
  const stock = Number.isNaN(Number(f.stock)) ? f.stock : Number(f.stock);
  const rating = Number(f.rating);

  if (!name) errs.name = "Product name is required.";
  if (String(f.price).trim() === "" || Number.isNaN(price)) errs.price = "Enter a valid price.";
  else if (price < 0) errs.price = "Price must be ≥ 0.";

  if (String(stock).trim() !== "") {
    const iv = parseInt(stock, 10);
    if (Number.isNaN(iv) || iv < 0) errs.stock = "Stock must be an integer ≥ 0.";
  }

  if (String(f.rating).trim() !== "") {
    if (Number.isNaN(rating) || rating < 0 || rating > 5) errs.rating = "Rating must be 0–5.";
  }

  if (img && !isAcceptableImageRef(img)) {
    errs.img = "Use an http(s) URL, a data URL, or a path under /public/images (images/...).";
  }
  if (category.length > 50) errs.category = "Category is too long (max 50 chars).";

  return errs;
};

/* ===================== fetchHandler ===================== */
const fetchHandler = async () => {
  const res = await axios.get(URL);
  return res.data;
};

/* ===================== Modal ===================== */
function ProductModal({ open, onClose, onSave, product }) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    img: "",
    price: "",
    stock: 0,
    rating: 4.5,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [previewSrc, setPreviewSrc] = useState("");

  const PRICE_RX = /^\d{0,9}(\.\d{0,2})?$/;
  const STOCK_RX = /^\d{0,9}$/;
  const RATING_RX = /^(?:[0-4](?:\.\d{0,1})?|5(?:\.0?)?)?$/;

  const syncValidate = (next) => {
    const e = validateProduct(next);
    setErrors(e);
    return e;
  };

  useEffect(() => {
    if (open) {
      const initial = {
        name: product?.name ?? "",
        category: product?.category ?? "",
        img: product?.img ?? "",
        price: product?.price ?? "",
        stock: product?.stock ?? 0,
        rating: product?.rating ?? 4.5,
      };
      setForm(initial);
      setTouched({});
      syncValidate(initial);

      if (!initial.img) setPreviewSrc("");
      else if (initial.img.startsWith("data:image/")) setPreviewSrc(initial.img);
      else if (initial.img.startsWith("images/")) setPreviewSrc("/" + initial.img);
      else setPreviewSrc(initial.img);
    }
  }, [open, product]);

  if (!open) return null;

  const setField = (key, val) => {
    const next = { ...form, [key]: val };
    setForm(next);
    syncValidate(next);
  };
  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));
  const fieldClass = (key) => (touched[key] && errors[key] ? "input error" : "input");
  const errorText = (key) =>
    touched[key] && errors[key] ? <div className="err-text">{errors[key]}</div> : null;

  const handlePriceChange = (e) => {
    const v = e.target.value.trim();
    if (v === "" || PRICE_RX.test(v)) setField("price", v);
  };
  const handleStockChange = (e) => {
    const v = e.target.value.trim();
    if (v === "" || STOCK_RX.test(v)) setField("stock", v);
  };
  const handleRatingChange = (e) => {
    const v = e.target.value.trim();
    if (v === "" || RATING_RX.test(v)) setField("rating", v);
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setField("img", dataUrl);
      setPreviewSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{product ? `Edit Product` : "Add Product"}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form className="grid grid-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label>Product Name <span style={{ color: "#b91c1c" }}>*</span></label>
              <input
                className={fieldClass("name")}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder="e.g., Leather Handbag"
                required
                maxLength={120}
                inputMode="text"
              />
              {errorText("name")}
            </div>

            <div>
              <label>Category</label>
              <input
                className={fieldClass("category")}
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                onBlur={() => markTouched("category")}
                placeholder="e.g., Handbags"
                maxLength={50}
                inputMode="text"
              />
              {errorText("category")}
            </div>

            <div>
              <label>Image</label>
              <input type="file" accept="image/*" onChange={handlePickFile} />
              <small className="muted">
                Stored as a data URL (or paste http(s)/images/... into the text box below)
              </small>
              <input
                className={fieldClass("img")}
                style={{ marginTop: 6 }}
                placeholder="data:image/png;base64,... or images/photo.png or https://..."
                value={form.img}
                onChange={(e) => setField("img", e.target.value)}
                onBlur={() => markTouched("img")}
                inputMode="url"
              />
              {previewSrc ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={previewSrc}
                    alt=""
                    className="pimg"
                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64")}
                  />
                </div>
              ) : null}
              {errorText("img")}
            </div>

            <div>
              <label>Price (LKR) <span style={{ color: "#b91c1c" }}>*</span></label>
              <input
                className={fieldClass("price")}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.price}
                onChange={handlePriceChange}
                onBlur={() => markTouched("price")}
                onPaste={(e) => {
                  const v = (e.clipboardData.getData("text") || "").trim();
                  if (!(v === "" || /^\d{0,9}(\.\d{0,2})?$/.test(v))) e.preventDefault();
                }}
              />
              {errorText("price")}
            </div>

            <div>
              <label>Stock</label>
              <input
                className={fieldClass("stock")}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.stock}
                onChange={handleStockChange}
                onBlur={() => markTouched("stock")}
                onPaste={(e) => {
                  const v = (e.clipboardData.getData("text") || "").trim();
                  if (!(v === "" || /^\d{0,9}$/.test(v))) e.preventDefault();
                }}
              />
              {errorText("stock")}
            </div>

            <div>
              <label>Rating (0–5)</label>
              <input
                className={fieldClass("rating")}
                type="text"
                inputMode="decimal"
                placeholder="4.5"
                value={form.rating}
                onChange={(e) => setField("rating", e.target.value)}
                onBlur={() => markTouched("rating")}
                onPaste={(e) => {
                  const v = (e.clipboardData.getData("text") || "").trim();
                  if (!(v === "" || /^(?:[0-4](?:\.\d{0,1})?|5(?:\.0?)?)?$/.test(v))) e.preventDefault();
                }}
              />
              {errorText("rating")}
            </div>
          </form>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={Object.keys(errors).length > 0}
            title={Object.keys(errors).length ? "Fix validation errors to save" : "Save"}
            onClick={() => {
              setTouched({ name: true, category: true, img: true, price: true, stock: true, rating: true });
              const errs = validateProduct(form);
              setErrors(errs);
              if (Object.keys(errs).length > 0) return;
              const payload = {
                name: form.name.trim(),
                category: form.category.trim(),
                img: form.img.trim(),
                price: parseFloat(form.price || 0),
                stock: parseInt(form.stock || 0, 10),
                rating: parseFloat(form.rating || 0),
              };
              onSave(payload);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Page (Admin only) ===================== */
export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState({ open: false, product: null });
  const navigate = useNavigate();

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchHandler();
      const list = unpackList(data);
      setProducts(list.map((row, i) => toUI(row, i)));
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
    fetchAll();
    const onBump = () => fetchAll();
    window.addEventListener("products:changed", onBump);
    return () => window.removeEventListener("products:changed", onBump);
  }, []);

  const productsWithSeq = useMemo(
    () => products.map((p, i) => ({ ...p, seq: i + 1 })),
    [products]
  );

  const discounted = useMemo(
    () =>
      productsWithSeq.filter(
        (p) => p.discountType !== "none" && (p.discountValue || 0) > 0
      ),
    [productsWithSeq]
  );

  const onSaveModal = async (payload) => {
    try {
      if (!modal.product) {
        // CREATE
        await axios.post(URL, payload, { headers: { "Content-Type": "application/json" } });
      } else {
        // IMPORTANT: use realId for edits
        const rid = modal.product.realId;
        if (!rid) throw new Error("Missing product id for update");
        await axios.put(`${URL}/${rid}`, payload, {
          headers: { "Content-Type": "application/json" },
        });
      }
      await fetchAll();
      setModal({ open: false, product: null });
      window.dispatchEvent(new Event("products:changed"));
    } catch (e) {
      const msg =
        e?.response?.status === 404
          ? `404 Not Found: ${URL} — check POST/PUT route`
          : e?.response?.data?.message || e.message || "Save failed";
      alert(msg);
    }
  };

  const onDelete = async (realId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      // DELETE — use realId (Mongo _id)
      await axios.delete(`${URL}/${realId}`);
      await fetchAll();
      window.dispatchEvent(new Event("products:changed"));
    } catch (e) {
      const msg =
        e?.response?.status === 404
          ? `404 Not Found: ${URL}/${realId} — check DELETE route`
          : e?.response?.data?.message || e.message || "Delete failed";
      alert(msg);
    }
  };

  const imgSrc = (val) => {
    if (!val) return "https://via.placeholder.com/64";
    if (val.startsWith("data:image/")) return val;
    if (val.startsWith("images/")) return "/" + val;
    return val;
  };

  return (
    <div className="page-wrap products-page">
      <Sidebarsa />

      <main className="content products-page">
        <h1 className="page-title">Products</h1>
        <p className="muted">Admin (Customer view moved to a separate page)</p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn" onClick={() => navigate("/customer")}>👀 Open Customer View</button>
        </div>

        {loading && <div className="muted">Loading products…</div>}
        {err && <div className="error" style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</div>}

        <section className="section">
          <div className="head">
            <h3>Manage Products</h3>
            <div className="actions">
              <button className="btn primary" onClick={() => setModal({ open: true, product: null })}>➕ Add Product</button>
              <button className="btn" onClick={fetchAll}>Reload</button>
            </div>
          </div>
          <div className="body">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>IMAGE</th><th>NAME</th><th>CATEGORY</th>
                  <th className="right">PRICE (LKR)</th>
                  <th className="center">DISC</th>
                  <th className="center">STOCK</th>
                  <th className="center">REORDER LEVEL</th>
                  <th className="center">RATING</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {productsWithSeq.map((p) => (
                  <tr key={p.realId || p.uiId}>
                    <td>{p.seq}</td>
                    <td>
                      <img
                        className="pimg"
                        src={imgSrc(p.img)}
                        alt=""
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64")}
                      />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category || ""}</td>
                    <td className="right">{money(p.price)}</td>
                    <td className="center">
                      {p.discountType === "percentage" ? pct(p.discountValue)
                        : p.discountType === "fixed" ? "LKR " + Number(p.discountValue).toLocaleString()
                        : "—"}
                    </td>
                    <td className="center">{p.stock || 0}</td>
                    <td className="center">{p.reorderLevel ?? 20}</td>
                    <td className="center">{(p.rating || 0).toFixed(1)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn" onClick={() => setModal({ open: true, product: p })}>
                          Edit
                        </button>
                        <button className="btn red" onClick={() => onDelete(p.realId)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !err && productsWithSeq.length === 0 && (
                  <tr><td colSpan={10} className="muted">No products</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {discounted.length > 0 && (
          <section className="section">
            <div className="head"><h3>Active Discounts</h3></div>
            <div className="body">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>PRODUCT</th>
                    <th className="right">BASE PRICE</th>
                    <th>TYPE</th>
                    <th className="right">VALUE</th>
                    <th className="right">NEW PRICE</th>
                    <th className="right">YOU SAVE</th>
                  </tr>
                </thead>
                <tbody>
                  {discounted.map((p, i) => {
                    const ep = effectivePrice(p);
                    const sv = saving(p);
                    return (
                      <tr key={p.realId || p.uiId}>
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
        )}

        <ProductModal
          open={modal.open}
          product={modal.product}
          onClose={() => setModal({ open: false, product: null })}
          onSave={onSaveModal}
        />
      </main>
    </div>
  );
}
