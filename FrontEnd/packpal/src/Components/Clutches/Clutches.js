import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clutches.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

const STORAGE_KEY = "packPalCart";
// We will NOT auto-navigate to /cart from Add to Cart anymore
// const CART_PAGE = "/cart";

function Clutches() {
  const navigate = useNavigate();

  const img = (nameOrPath) => {
    if (!nameOrPath) return "";
    if (
      nameOrPath.startsWith("http") ||
      nameOrPath.startsWith("images/") ||
      nameOrPath.startsWith("/images/")
    ) {
      return nameOrPath.startsWith("/") ? nameOrPath : `/${nameOrPath}`;
    }
    return `${process.env.PUBLIC_URL}/images/${nameOrPath}`;
  };

  const PRODUCTS = [
    { id: "c2", title: "Elegant Style C2", price: 2500, img: "images/c2.jpg", category: "Classic", isNew: true, discountPct: 10, desc: "Soft pastel flap clutch with tassel accents—perfect for semi-formal events.", specs: { Color: "Blush", Strap: "Detachable", Material: "Vegan leather", Weight: "260g" }, rating: 4.6, reviews: 112 },
    { id: "c8", title: "Stylish C8", price: 2850, img: "images/c8.jpg", category: "Bold", isNew: false, discountPct: 0, desc: "Vibrant statement clutch with tassel closure that turns heads.", specs: { Color: "Amber", Strap: "Wristlet", Material: "PU", Weight: "280g" }, rating: 4.2, reviews: 87 },
    { id: "c23", title: "Classic C23", price: 2500, img: "images/c23.jpg", category: "Classic", isNew: true, discountPct: 15, desc: "Round emerald clutch for elegant evenings and weddings.", specs: { Color: "Emerald", Strap: "Chain", Material: "Acrylic", Weight: "300g" }, rating: 4.8, reviews: 154 },
    { id: "c234", title: "Modern C234", price: 3000, img: "images/c234.jpg", category: "Modern", isNew: false, discountPct: 0, desc: "Jewel-tone beaded clutch with gold chain for modern glam.", specs: { Color: "Purple", Strap: "Chain", Material: "Beads", Weight: "320g" }, rating: 4.4, reviews: 63 },
    { id: "cbx", title: "Crystal Box", price: 3200, img: "images/clutch04.jpg", category: "Crystal", isNew: false, discountPct: 20, desc: "Black crystal box clutch with bead handle—compact & luxe.", specs: { Color: "Black", Strap: "Bead handle", Material: "Crystal/Metal", Weight: "350g" }, rating: 4.7, reviews: 201 },
    { id: "tw1", title: "Twin Style", price: 2950, img: "images/clutches2.jpg", category: "Modern", isNew: true, discountPct: 0, desc: "Sunny twin-panel clutch to brighten any outfit.", specs: { Color: "Sunflower", Strap: "Golden chain", Material: "PU", Weight: "290g" }, rating: 4.3, reviews: 95 },
    { id: "mesh", title: "Statement Mesh", price: 3800, img: "images/clutchh1.jpg", category: "Mesh", isNew: false, discountPct: 12, desc: "Icy blue mesh pouch with soft silhouette and roomy interior.", specs: { Color: "Ice Blue", Strap: "Drawstring", Material: "Mesh", Weight: "260g" }, rating: 4.1, reviews: 72 },
    { id: "gala", title: "Golden Gala", price: 3500, img: "images/clutchh11.jpg", category: "Crystal", isNew: false, discountPct: 0, desc: "Sparkly silver-white clutch for premium occasions.", specs: { Color: "Silver", Strap: "Chain", Material: "Sequins", Weight: "300g" }, rating: 4.9, reviews: 319 },
  ];

  const LKR = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (n) => LKR.format(n);
  const finalPrice = (p) =>
    p.discountPct && p.discountPct > 0 ? p.price * (1 - p.discountPct / 100) : p.price;

  const [filters, setFilters] = useState({ q: "", category: "All" });
  const [cart, setCart] = useState([]);       // UI mini-cart list (drawer)
  const [drawerOpen, setDrawerOpen] = useState(false); // we won't auto-open it anymore
  const [modalId, setModalId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))],
    []
  );

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    return PRODUCTS.filter((p) => {
      const matchQ = !q || p.title.toLowerCase().includes(q);
      const matchC = filters.category === "All" || p.category === filters.category;
      return matchQ && matchC;
    });
  }, [filters]);

  const cartTotal = cart.reduce((a, c) => a + c.qty * c.price, 0);

  // ---- Add to Cart: save to shared storage + signal header; DO NOT navigate or open drawer
  const addToCart = (id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const price = Number(finalPrice(p));
    const imageUrl = img(p.img);

    // update local drawer state silently
    setCart((prev) => {
      const i = prev.findIndex((it) => it.id === id);
      if (i > -1) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { id: p.id, title: p.title, price, img: imageUrl, qty: 1 }];
    });

    const lineItem = {
      id: Date.now(),
      name: p.title,
      price,
      quantity: 1,
      img: imageUrl,
      icon: "👜",
    };
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      stored.push(lineItem);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {}

    window.dispatchEvent(new Event("cart:updated"));
    setToast("Added to cart");
    // no navigate, no drawer open
  };

  const incItem = (id) =>
    setCart((prev) => prev.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it)));
  const decItem = (id) =>
    setCart((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: it.qty - 1 } : it))
        .filter((it) => it.qty > 0)
    );
  const removeAll = (id) => setCart((prev) => prev.filter((it) => it.id !== id));

  const ratingSnippet = (rating, reviews) => {
    const r = (Math.round(rating * 10) / 10).toFixed(1);
    return (
      <div className="rating-row" aria-label={`Rated ${r} out of 5 from ${reviews} reviews`}>
        <span className="stars" style={{ ["--rating"]: r }} aria-hidden="true" />
        <span className="rating-num">
          {r} • {reviews.toLocaleString()} reviews
        </span>
      </div>
    );
  };

  const modalProduct = modalId ? PRODUCTS.find((p) => p.id === modalId) : null;
  const closeModal = () => setModalId(null);

  const dots = Array.from({ length: 36 }).map((_, i) => {
    const left = `${Math.random() * 100}%`;
    const delay = `${-Math.random() * 12}s`;
    const dur = `${10 + Math.random() * 10}s`;
    const drift = `${(Math.random() * 160 - 80).toFixed(0)}px`;
    const scale = (0.7 + Math.random() * 0.8).toFixed(2);
    const cls = Math.random() < 0.18 ? "lg" : Math.random() < 0.6 ? "sm" : "";
    return (
      <span
        key={i}
        className={`dot ${cls}`}
        style={{ left, "--delay": delay, "--dur": dur, "--dx": drift, "--scale": scale }}
        aria-hidden="true"
      />
    );
  });

  return (
    <div className="clutches-page">
      <Header />
      {/* HERO */}
      <section className="hero" role="region" aria-label="Clutches hero">
        <div className="dots" aria-hidden="true">{dots}</div>
        <div className="hero-content">
          <h1>Premium Clutch Collection</h1>
          <p>Explore our curated selection of elegant clutches—perfect for every occasion.</p>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search clutches by name…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              aria-label="Search clutches"
            />
            <button className="search-btn" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="filters">
        <div className="chips">
          {categories.map((c) => (
            <button
              key={c}
              className={`chip${filters.category === c ? " active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, category: c }))}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* GRID */}
      <main className="main-content" id="clutches">
        {filtered.length === 0 ? (
          <div className="empty">No products match your search.</div>
        ) : (
          <section className="products-grid" id="grid">
            {filtered.map((p) => {
              const now = finalPrice(p);
              const hasDisc = p.discountPct && p.discountPct > 0;
              return (
                <article className="product-card" key={p.id}>
                  <div className="product-image">
                    {p.isNew && <span className="badge-new">NEW</span>}
                    {hasDisc && <span className="badge-off">-{p.discountPct}%</span>}
                    <img src={img(p.img)} alt={p.title} />
                  </div>
                  <div className="product-info">
                    <div className="product-category">{p.category}</div>
                    <h3 className="product-title">{p.title}</h3>
                    {ratingSnippet(p.rating, p.reviews)}
                    <div className="price-row">
                      <div className="price-now">{money(now)}</div>
                      {hasDisc && (
                        <>
                          <div className="price-old">{money(p.price)}</div>
                          <div className="price-save">Save {p.discountPct}%</div>
                        </>
                      )}
                    </div>
                    <div className="product-actions">
                      <button className="btn btn-ghost" onClick={() => setModalId(p.id)}>
                        More
                      </button>
                      <button className="btn btn-primary" onClick={() => addToCart(p.id)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* Drawer (kept, but never auto-opened) */}
      <aside
        className={`drawer${drawerOpen ? " open" : ""}`}
        aria-hidden={drawerOpen ? "false" : "true"}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
      >
        <div className="drawer-header">
          <div className="drawer-title">Shopping Cart</div>
          <button className="close-x" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <div className="drawer-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b" }}>Your cart is empty.</div>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.img} alt={item.title} />
                <div style={{ flex: 1 }}>
                  <div className="ci-title">{item.title}</div>
                  <div className="qty-wrap">
                    <button className="qty-btn" onClick={() => decItem(item.id)} aria-label="Decrease">−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => incItem(item.id)} aria-label="Increase">+</button>
                    <button className="remove" onClick={() => removeAll(item.id)} title="Remove all">✕</button>
                  </div>
                </div>
                <div className="ci-price">{money(item.price * item.qty)}</div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-footer">
          <div className="total-row">
            <span>Total:</span>
            <span>{money(cartTotal)}</span>
          </div>
          <button className="checkout" onClick={() => navigate("/checkout")}>
            Checkout
          </button>
        </div>
      </aside>

      {/* MODAL */}
      {modalProduct && (
        <div
          className="modal open"
          aria-hidden="false"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-card">
            <div className="modal-img">
              <img src={img(modalProduct.img)} alt={modalProduct.title} />
            </div>
            <div className="modal-body">
              <h3>{modalProduct.title}</h3>
              <div className="modal-rating">
                <span
                  className="stars"
                  style={{ ["--rating"]: (Math.round(modalProduct.rating * 10) / 10).toFixed(1) }}
                  aria-hidden="true"
                />
                <span className="rating-num">
                  {(Math.round(modalProduct.rating * 10) / 10).toFixed(1)} • {modalProduct.reviews.toLocaleString()} reviews
                </span>
              </div>
              <div className="modal-price-row">
                <div className="modal-price-now">{money(finalPrice(modalProduct))}</div>
                {modalProduct.discountPct > 0 && (
                  <div className="modal-price-old">{money(modalProduct.price)}</div>
                )}
              </div>
              <p className="modal-desc">{modalProduct.desc}</p>
              <div className="specs">
                {Object.entries(modalProduct.specs || {}).map(([k, v]) => (
                  <div className="spec" key={k}>{k}: {v}</div>
                ))}
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    addToCart(modalProduct.id);
                    closeModal();
                  }}
                >
                  Add to Cart
                </button>
                <button className="modal-close" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>

      <Footer />
    </div>
  );
}

export default Clutches;
