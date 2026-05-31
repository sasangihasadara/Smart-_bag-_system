// src/pages/CustomerView.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Customerview.css";

const URL = "http://localhost:5000/api/carts";
const STORAGE_KEY = "packPalCart";
const WISHLIST_KEY = "packPalWishlist";

/* -------- temporary stubs (replace with real components or import) -------- */
const Header = () => null;
const Footer = () => null;
/* ------------------------------------------------------------------------ */

/* -------- helpers -------- */
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

const discountText = (p) => {
  if (!p || p.discountType === "none" || !Number(p.discountValue)) return "No discount";
  return p.discountType === "percentage" ? `${pct(p.discountValue)} off` : `${money(p.discountValue)} off`;
};

const summaryLine = (p) => {
  const now = money(effectivePrice(p));
  const was = p.discountType !== "none" && Number(p.discountValue) ? ` (was ${money(p.price)})` : "";
  const dsc = discountText(p);
  return `${p.name} · ${now}${was} · ${dsc}`;
};

const toUI = (row) => ({
  id: String(row?.id ?? row?._id ?? row?.productId ?? Math.random().toString(36).slice(2, 10)),
  name: row?.name ?? "Unnamed",
  category: row?.category ?? "BACKPACKS",
  img: row?.img ?? "",
  price: Number(row?.price ?? 0),
  rating: Number(row?.rating ?? 4.5),
  reviews: Number(row?.reviews ?? row?.ratingCount ?? 95),
  discountType: row?.discountType ?? "none",
  discountValue: Number(row?.discountValue ?? 0),
  badge: row?.badge ?? row?.tag ?? "",
  description:
    row?.description ??
    row?.shortDescription ??
    "Sunny twin-panel clutch to brighten any outfit. Satin lining and a detachable chain let you go handheld or shoulder, your choice.",
  color: row?.color ?? "Sunflower",
  strap: row?.strap ?? "Golden chain",
  material: row?.material ?? "PU",
  weight: String(row?.weight ?? "290g"),
});

const imgSrc = (val) => {
  if (!val) return "https://via.placeholder.com/800x600?text=Bag";
  if (/^https?:\/\//i.test(val)) return val;
  if (val.startsWith("/")) return val;
  if (val.startsWith("images/")) return "/" + val;
  return val;
};

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const writeJSON = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const stars = (val = 0) => {
  const n = Math.max(0, Math.min(5, Number(val)));
  const full = "★".repeat(Math.floor(n));
  const half = n % 1 >= 0.5 ? "½" : "";
  const rest = "☆".repeat(5 - Math.ceil(n));
  return `${full}${half}${rest}`;
};

/* -------- component -------- */
export default function CustomerView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(null);
  const [wishlist, setWishlist] = useState(() => new Set(readJSON(WISHLIST_KEY, [])));
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await axios.get(URL).then((r) => r.data);
        const list = Array.isArray(data) ? data : data?.products ?? data?.items ?? data?.data ?? [];
        if (mounted) setProducts(list.map(toUI));
      } catch (e) {
        const msg =
          e?.response?.status === 404
            ? `404 Not Found: ${URL} — check your backend route`
            : e?.response?.data?.message || e.message || "Failed to load";
        if (mounted) setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const readCart = () => readJSON(STORAGE_KEY, []);
  const writeCart = (arr) => writeJSON(STORAGE_KEY, arr);

  const addToCart = (p) => {
    const newItem = {
      id: String(p.id),
      name: p.name,
      price: Number(effectivePrice(p)),
      quantity: 1,
      icon: "🎒",
      img: imgSrc(p.img),
      category: p.category || "",
      description: p.description || "Added from Customer View",
    };
    const list = readCart();
    const idx = list.findIndex((x) => String(x.id) === String(newItem.id));
    if (idx >= 0) list[idx].quantity = Math.max(1, Number(list[idx].quantity || 1) + 1);
    else list.push(newItem);
    writeCart(list);
    navigate("/cart", { state: { justAdded: newItem }, replace: false });
  };

  const isWished = (id) => wishlist.has(String(id));
  const toggleWishlist = (p) => {
    const id = String(p.id);
    const next = new Set(wishlist);
    next.has(id) ? next.delete(id) : next.add(id);
    setWishlist(next);
    writeJSON(WISHLIST_KEY, Array.from(next));
  };

  const openMore = (p) => { setActive(p); setShow(true); };
  const closeMore = () => { setShow(false); setActive(null); };

  return (
    <div className="page-wrap cv-page no-sidebar">
      <Header />

      <main className="cv-main">
        {/* HERO */}
        <header className="cv-hero">
          <div className="cv-hero-content">
            <h1 className="cv-title">
              <span className="cv-title-line">Bright &amp; Tough Bags</span>
            </h1>

            <p>Crafted for play, school, and beyond.</p>

            <div className="cv-hero-search">
              <input
                placeholder="Search: unicorn, superhero, waterproof, trolley…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                aria-label="Search products"
              />
              <button type="button" aria-label="Search">🔍</button>
            </div>
          </div>
        </header>

        <section className="cv-container">
          <div className="cv-list-head" style={{ alignItems: "center" }}>
            <div className="cv-count">
              {loading ? "Loading…" : <>Showing <strong>{filtered.length}</strong> products</>}
            </div>
          </div>

          {err && <div className="cv-error">{err}</div>}

          <div className="cards-grid">
            {filtered.map((p) => {
              const isDiscount = p.discountType !== "none" && Number(p.discountValue) > 0;
              const newPrice = money(effectivePrice(p));
              const oldPrice = money(p.price);
              const chip = p.discountType === "percentage" ? `${pct(p.discountValue)}` : `-${money(p.discountValue)}`;
              const wished = isWished(p.id);

              return (
                <article className="card" key={p.id}>
                  <div className="card-media">
                    {!!p.badge && <span className="badge">{String(p.badge).toUpperCase()}</span>}
                    <img
                      src={imgSrc(p.img)}
                      alt={p.name}
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/800x600?text=Bag"; }}
                      draggable={false}
                    />
                  </div>

                  <div className="price-block">
                    {isDiscount ? (
                      <>
                        <span className="price-old">{oldPrice}</span>
                        <span className="price-new">{newPrice}</span>
                        <span className="price-chip">{chip}</span>
                      </>
                    ) : (
                      <span className="price-new">{oldPrice}</span>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="category">{(p.category || "BACKPACKS").toUpperCase()}</div>
                    <h3 className="title">{p.name}</h3>

                    <div className="rating-row">
                      <span className="stars" aria-hidden="true">{stars(p.rating)}</span>
                      <span className="reviews">({p.reviews})</span>
                    </div>

                    <div className="btn-row">
                      <button type="button" className="btn primary" onClick={() => addToCart(p)}>
                        Add to Cart
                      </button>
                      <button type="button" className="btn ghost" onClick={() => openMore(p)}>
                        More
                      </button>
                      <button
                        type="button"
                        className={`btn heart${wished ? " active" : ""}`}
                        aria-pressed={wished}
                        title={wished ? "Remove from wishlist" : "Add to wishlist"}
                        onClick={() => toggleWishlist(p)}
                        style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
                      >
                        {wished ? "♥" : "♡"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!loading && !err && filtered.length === 0 && (
            <div className="cv-empty">No matching products</div>
          )}
        </section>

        {show && active && (
          <div role="dialog" aria-modal="true" onClick={closeMore} className="cv-modal">
            <div className="cv-modal-card big" onClick={(e) => e.stopPropagation()}>
              <div className="cv-modal-hero">
                <img
                  src={imgSrc(active.img)}
                  alt={active.name}
                  onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/1000x800?text=Bag"; }}
                  draggable={false}
                />
              </div>

              <div className="cv-modal-body">
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  {summaryLine(active)}
                </div>

                <h2 className="mb-4" style={{ marginTop: 0 }}>{active.name}</h2>

                <div className="rating-and-price">
                  <div className="rating-badge">
                    <span className="stars">{stars(active.rating)}</span>
                    <span className="muted"> · {active.reviews} reviews</span>
                  </div>
                  <div className="price-stack">
                    <div className="price-main">{money(effectivePrice(active))}</div>
                    {active.discountType !== "none" && <div className="price-was">{money(active.price)}</div>}
                  </div>
                </div>

                <p className="muted" style={{ marginTop: 10 }}>{active.description}</p>

                <div className="mt-3">
                  <button type="button" className="btn primary" onClick={() => addToCart(active)}>
                    Add to Cart
                  </button>
                  <button type="button" className="btn" onClick={closeMore} style={{ marginLeft: 8 }}>
                    Close
                  </button>
                  <button
                    type="button"
                    className={`btn heart${isWished(active.id) ? " active" : ""}`}
                    aria-pressed={isWished(active.id)}
                    title={isWished(active.id) ? "Remove from wishlist" : "Add to wishlist"}
                    onClick={() => toggleWishlist(active)}
                    style={{ marginLeft: 8 }}
                  >
                    {isWished(active.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
