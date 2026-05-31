import React, { useEffect, useRef } from "react";
import "./Accessories.css";
import Header from "../Header/Header";

import Footer from "../Footer/Footer";

export default function Accessories() {
  const rootRef = useRef(null);

  useEffect(() => {
    // ===== Scoped helpers (only inside this page) =====
    const $  = (s, r = rootRef.current) => r?.querySelector(s);
    const $$ = (s, r = rootRef.current) => Array.from(r?.querySelectorAll(s) || []);
    const money = (n) => `LKR ${Number(n).toLocaleString()}`;

    const imgFallback = (img) => {
      if (!img) return;
      img.onerror = null;
      img.src =
        "data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 840'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23f3f4f6'/%3E%3Cstop offset='1' stop-color='%23e5e7eb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1200' height='840'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Segoe UI' font-size='44' fill='%2399a1b1'%3ENo image%3C/text%3E%3C/svg%3E";
    };

    const showToast = (msg) => {
      const t = $("#toast");
      if (!t) return;
      t.textContent = msg;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 3000);
    };

    const parsePriceLKR = (text) => {
      const num = (text || "").replace(/[^\d.]/g, "");
      const n = parseFloat(num);
      return Number.isNaN(n) ? 0 : n;
    };

    // ===== State kept in refs so we don't force rerenders =====
    const cartRef = { current: [] };
    const detailsRef = { current: null };

    // ===== Behavior =====
    const filterProducts = (category) => {
      const grid = $("#productsGrid");
      const info = $("#resultsInfo");
      if (!grid || !info) return;

      $$(".filter-btn").forEach((b) => b.classList.remove("active"));
      $(`.filter-btn[data-category="${category}"]`)?.classList.add("active");

      grid.style.opacity = "0.5";
      setTimeout(() => {
        let visible = 0;
        $$(".product-card").forEach((card) => {
          const show = category === "all" || card.classList.contains(category);
          card.style.display = show ? "block" : "none";
          if (show) visible++;
        });
        const label = category === "all" ? "all categories" : category.replace("-", " ");
        info.innerHTML = `Showing <strong>${visible} products</strong> in ${label}`;
        grid.style.opacity = "1";
      }, 150);
    };

    const searchProducts = () => {
      const input = $("#searchInput");
      const info = $("#resultsInfo");
      if (!input || !info) return;
      const term = input.value.toLowerCase().trim();

      let visible = 0;
      $$(".product-card").forEach((card) => {
        const t = $(".product-title", card)?.textContent.toLowerCase() || "";
        const c = $(".product-category", card)?.textContent.toLowerCase() || "";
        const show = !term || t.includes(term) || c.includes(term);
        card.style.display = show ? "block" : "none";
        if (show) visible++;
      });

      info.innerHTML = term
        ? `Found <strong>${visible} products</strong> for "${term}"`
        : `Showing <strong>${visible} products</strong> in all categories`;
    };

    const addToCart = (name, price, button) => {
      cartRef.current.push({ id: Date.now(), name, price, quantity: 1 });
      const count = $("#cartCount");
      if (count) count.textContent = String(cartRef.current.length);

      if (button) {
        const prev = button.textContent;
        button.textContent = "✓ Added";
        button.style.background = "linear-gradient(135deg,#10b981,#059669)";
        setTimeout(() => {
          button.textContent = prev;
          button.style.background = "linear-gradient(135deg,#2563eb,#1d4ed8)";
        }, 900);
      }
      showToast(`${name} added to cart`);
    };

    const updateCartModal = () => {
      const list = $("#cartItems");
      const totalEl = $("#cartTotal");
      if (!list || !totalEl) return;

      let total = 0;
      let html = "";

      cartRef.current.forEach((item, i) => {
        total += item.price * item.quantity;
        html += `
          <div class="cart-row">
            <div class="cart-row-left">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-meta">Qty: ${item.quantity}</div>
            </div>
            <div class="cart-row-right">
              <div class="cart-item-price">${money(item.price * item.quantity)}</div>
              <button class="cart-remove" data-index="${i}">Remove</button>
            </div>
          </div>`;
      });

      list.innerHTML = html || '<div class="cart-empty">Your cart is empty</div>';
      totalEl.textContent = money(total);

      // bind removes
      $$(".cart-remove", list).forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-index"));
          cartRef.current.splice(idx, 1);
          const count = $("#cartCount");
          if (count) count.textContent = String(cartRef.current.length);
          updateCartModal();
          showToast("Item removed");
        });
      });
    };

    const openDetails = (card) => {
      const title = $(".product-title", card)?.textContent.trim() || "Accessory";
      const category = $(".product-category", card)?.textContent.trim() || "";
      const stars = $(".stars", card)?.textContent.trim() || "★★★★★";
      const rating = $(".rating-text", card)?.textContent.trim() || "";
      const priceTxt =
        $(".product-price .current-price", card)?.textContent.trim() ||
        $(".product-price", card)?.textContent.trim() ||
        "";
      const longDesc = card.dataset.descLong?.trim() || "";
      const imgSrc = $(".product-image img.fit", card)?.getAttribute("src") || "";

      $("#detailsTitle").textContent = title;
      $("#detailsCategory").textContent = category;
      $("#detailsStars").textContent = stars;
      $("#detailsRating").textContent = rating;
      $("#detailsPrice").textContent = priceTxt;
      $("#detailsDesc").textContent = longDesc;

      const img = $("#detailsImage");
      if (img) {
        img.src = imgSrc;
        img.alt = title;
        img.onerror = () => imgFallback(img);
      }

      detailsRef.current = { name: title, price: parsePriceLKR(priceTxt) };
      const m = $("#detailsModal");
      if (m) {
        m.style.display = "flex";
        m.setAttribute("aria-hidden", "false");
      }
    };

    const closeDetails = () => {
      const m = $("#detailsModal");
      if (m) {
        m.style.display = "none";
        m.setAttribute("aria-hidden", "true");
      }
    };

    const viewCart = () => {
      if (!cartRef.current.length) {
        showToast("Your cart is empty");
        return;
      }
      updateCartModal();
      const m = $("#cartModal");
      if (m) {
        m.style.display = "flex";
        m.setAttribute("aria-hidden", "false");
      }
    };

    const closeModal = () => {
      const m = $("#cartModal");
      if (m) {
        m.style.display = "none";
        m.setAttribute("aria-hidden", "true");
      }
    };

    const checkout = () => {
      if (!cartRef.current.length) {
        showToast("Your cart is empty");
        return;
      }
      showToast("Redirecting to checkout…");
      setTimeout(() => alert("Demo checkout complete."), 900);
    };

    // ===== Wire up within this component's root =====
    // image fallback
    $$(".product-image img.fit").forEach((img) =>
      img.addEventListener("error", () => imgFallback(img))
    );

    // filters
    $$(".filter-btn").forEach((btn) =>
      btn.addEventListener("click", () => filterProducts(btn.dataset.category))
    );

    // search
    $("#searchInput")?.addEventListener("input", searchProducts);
    $("#searchBtn")?.addEventListener("click", searchProducts);

    // add to cart buttons
    $$(".add-to-cart").forEach((btn) =>
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name") || "Accessory";
        const price = Number(btn.getAttribute("data-price") || 0);
        addToCart(name, price, btn);
      })
    );

    // details open
    $$(".more-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const card = btn.closest(".product-card");
        if (card) openDetails(card);
      })
    );

    // details add
    $("#detailsAddBtn")?.addEventListener("click", () => {
      if (!detailsRef.current) return;
      addToCart(detailsRef.current.name, detailsRef.current.price, null);
      closeDetails();
      viewCart();
    });

    // floating cart
    $("#floatingCart")?.addEventListener("click", viewCart);

    // close buttons
    $("#closeCartBtn")?.addEventListener("click", closeModal);
    $("#closeDetailsBtn")?.addEventListener("click", closeDetails);
    $("#checkoutBtn")?.addEventListener("click", checkout);

    // click outside to close
    $("#cartModal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    $("#detailsModal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDetails();
    });

    // escape key
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeDetails();
      }
    };
    document.addEventListener("keydown", onKey);

    // default filter state
    filterProducts("all");

    // cleanup on unmount
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const img = (name) => `${process.env.PUBLIC_URL}/images/${name}`;

  return (
    <div className="page-wrap">
      <Header/>
      <div className="acc-page" ref={rootRef}>
        {/* Hero */}
        <section className="hero">
          {/* Floating dots layer */}
          <div className="dots" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => {
              const left   = `${Math.random() * 100}%`;
              const delay  = `${-Math.random() * 12}s`;               // negative: already moving
              const dur    = `${10 + Math.random() * 10}s`;            // 10–20s
              const drift  = `${(Math.random() * 160 - 80).toFixed(0)}px`; // -80..80px
              const scale  = (0.7 + Math.random() * 0.8).toFixed(2);   // 0.7..1.5
              const sizeCls= Math.random() < 0.18 ? "lg" : (Math.random() < 0.5 ? "sm" : "");
              return (
                <span
                  key={i}
                  className={`dot ${sizeCls}`}
                  style={{
                    left,
                    "--delay": delay,
                    "--dur": dur,
                    "--dx": drift,
                    "--scale": scale,
                  }}
                />
              );
            })}
          </div>

          <div className="hero-content">
            <h1>Accessories that Complete Your Carry</h1>
            <p>Local images wired in — straps, tags, charms, wallets & more.</p>
            <div className="search-container">
              <input
                id="searchInput"
                className="search-input"
                placeholder="Search straps, tags, charms, wallets…"
              />
              <button className="search-btn" id="searchBtn" aria-label="Search">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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

        {/* Main */}
        <main className="main-content">
          {/* Filters */}
          <section className="filter-section">
            <div className="filter-container">
              <button className="filter-btn active" data-category="all">All</button>
              <button className="filter-btn" data-category="straps">Straps & Handles</button>
              <button className="filter-btn" data-category="charms">Charms & Keychains</button>
              <button className="filter-btn" data-category="wallets">Wallets & Pouches</button>
              <button className="filter-btn" data-category="tags">Bag Tags & Labels</button>
            </div>
            <div id="resultsInfo" className="results-info">
              Showing <strong>9 products</strong> in all categories
            </div>
          </section>

          {/* Grid */}
          <section id="productsGrid" className="products-grid">
            {/* STRAPS & HANDLES */}
            <div className="product-card straps" data-category="straps"
              data-desc-long="Premium adjustable crossbody strap (60–120 cm) with metal hardware and padded shoulder area. Fits most D-rings.">
              <div className="product-image">
                <img className="fit" src={img("crossbody_sttrap.png")} alt="Comfort Crossbody Strap" />
                <div className="product-badge">NEW</div>
              </div>
              <div className="product-info">
                <div className="product-category">Straps & Handles</div>
                <h3 className="product-title">Comfort Crossbody Strap</h3>
                <div className="product-rating"><span className="stars">★★★★★</span><span className="rating-text">(128 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 4,190</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Comfort Crossbody Strap" data-price="4190">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            <div className="product-card straps" data-category="straps"
              data-desc-long="Elegant gold-tone chain strap with leather shoulder pad. Includes two swivel clasps. Great for evening looks.">
              <div className="product-image">
                <img className="fit" src={img("gold_chain_strap.png")} alt="Gold Chain Strap" />
                <div className="product-badge">EVENING</div>
              </div>
              <div className="product-info">
                <div className="product-category">Straps & Handles</div>
                <h3 className="product-title">Gold Chain Strap</h3>
                <div className="product-rating"><span className="stars">★★★★☆</span><span className="rating-text">(41 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 3,990</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Gold Chain Strap" data-price="3990">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            <div className="product-card straps" data-category="straps"
              data-desc-long="Replacement padded top handle with reinforced stitching. Universal screw posts and spacers included.">
              <div className="product-image">
                <img className="fit" src={img("bag_handle.png")} alt="Replacement Bag Handle" />
                <div className="product-badge">COMFORT</div>
              </div>
              <div className="product-info">
                <div className="product-category">Straps & Handles</div>
                <h3 className="product-title">Replacement Bag Handle</h3>
                <div className="product-rating"><span className="stars">★★★★★</span><span className="rating-text">(67 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 2,950</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Replacement Bag Handle" data-price="2950">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            <div className="product-card straps" data-category="straps"
              data-desc-long="Metal accessory chain to clip on as a charm or strap extender. 80 cm length, 8 mm links.">
              <div className="product-image">
                <img className="fit" src={img("metal_chain.png")} alt="Accessory Metal Chain" />
                <div className="product-badge">METAL</div>
              </div>
              <div className="product-info">
                <div className="product-category">Straps & Handles</div>
                <h3 className="product-title">Accessory Metal Chain</h3>
                <div className="product-rating"><span className="stars">★★★★☆</span><span className="rating-text">(52 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 2,450</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Accessory Metal Chain" data-price="2450">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            {/* TAGS */}
            <div className="product-card tags" data-category="tags"
              data-desc-long="Personalized luggage tag with privacy flap. Add initials (up to 3). Durable buckle keeps it secure.">
              <div className="product-image">
                <img className="fit" src={img("monogram_bag.png")} alt="Monogram Bag Tag" />
                <div className="product-badge">PERSONALIZE</div>
              </div>
              <div className="product-info">
                <div className="product-category">Bag Tags & Labels</div>
                <h3 className="product-title">Monogram Bag Tag</h3>
                <div className="product-rating"><span className="stars">★★★★☆</span><span className="rating-text">(61 reviews)</span></div>
                <div className="product-price">
                  <span className="current-price">LKR 2,990</span>
                  <span className="original-price">LKR 3,490</span>
                  <span className="discount">14% OFF</span>
                </div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Monogram Bag Tag" data-price="2990">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            {/* CHARMS */}
            <div className="product-card charms" data-category="charms"
              data-desc-long="Metal logo charm with detachable key ring. Anti-scratch coating and secure lobster clasp. Adds flair without bulk.">
              <div className="product-image">
                <img className="fit" src={img("bag_charm_logo.png")} alt="Bag Charm – Logo" />
                <div className="product-badge">TRENDING</div>
              </div>
              <div className="product-info">
                <div className="product-category">Charms & Keychains</div>
                <h3 className="product-title">Bag Charm – Logo</h3>
                <div className="product-rating"><span className="stars">★★★★☆</span><span className="rating-text">(76 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 2,250</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Bag Charm – Logo" data-price="2250">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            <div className="product-card charms" data-category="charms"
              data-desc-long="Minimal key chain with quick-release ring and micro-strap to attach inside bags.">
              <div className="product-image">
                <img className="fit" src={img("logo_charm.png")} alt="Minimal Key Chain" />
                <div className="product-badge">ESSENTIAL</div>
              </div>
              <div className="product-info">
                <div className="product-category">Charms & Keychains</div>
                <h3 className="product-title">Minimal Key Chain</h3>
                <div className="product-rating"><span className="stars">★★★★★</span><span className="rating-text">(112 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 1,350</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Minimal Key Chain" data-price="1350">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            {/* WALLETS */}
            <div className="product-card wallets" data-category="wallets"
              data-desc-long="Slim RFID card holder with 6 slots and center pocket for folded cash. Premium microfibre lining.">
              <div className="product-image">
                <img className="fit" src={img("card_holder.png")} alt="Card Holder (RFID)" />
                <div className="product-badge">RFID SAFE</div>
              </div>
              <div className="product-info">
                <div className="product-category">Wallets & Pouches</div>
                <h3 className="product-title">Card Holder (RFID)</h3>
                <div className="product-rating"><span className="stars">★★★★★</span><span className="rating-text">(210 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 5,290</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Card Holder (RFID)" data-price="5290">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>

            <div className="product-card wallets" data-category="wallets"
              data-desc-long="Compact coin purse with wide-mouth zipper and key loop. Water-resistant lining.">
              <div className="product-image">
                <img className="fit" src={img("zip_coin.png")} alt="Zip Coin Purse" />
                <div className="product-badge">COMPACT</div>
              </div>
              <div className="product-info">
                <div className="product-category">Wallets & Pouches</div>
                <h3 className="product-title">Zip Coin Purse</h3>
                <div className="product-rating"><span className="stars">★★★★★</span><span className="rating-text">(158 reviews)</span></div>
                <div className="product-price"><span className="current-price">LKR 1,790</span></div>
                <div className="product-actions">
                  <button className="more-btn">More</button>
                  <button className="add-to-cart" data-name="Zip Coin Purse" data-price="1790">Add to Cart</button>
                  <button className="wishlist-btn" aria-label="Add to wishlist">♡</button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Floating Cart */}
        <button className="floating-cart" id="floatingCart" aria-label="Open cart">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
            <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z" />
          </svg>
          <span id="cartCount" className="cart-count">0</span>
        </button>

        {/* Cart Modal */}
        <div id="cartModal" className="modal" aria-hidden="true">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
            <div className="modal-header">
              <h2 id="cartTitle">Shopping Cart</h2>
              <button className="close-btn" id="closeCartBtn" aria-label="Close cart">&times;</button>
            </div>
            <div id="cartItems" className="cart-items" />
            <div className="cart-total">
              <div className="cart-total-row">
                <span>Total:</span><span id="cartTotal">LKR 0</span>
              </div>
              <button className="modal-cta" id="checkoutBtn">Proceed to Checkout</button>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        <div id="detailsModal" className="modal" aria-hidden="true">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="detailsTitle">
            <div className="modal-header">
              <h2 id="detailsTitle">Item details</h2>
              <button className="close-btn" id="closeDetailsBtn" aria-label="Close details">&times;</button>
            </div>
            <div className="details-layout">
              <img id="detailsImage" alt="" className="details-img" />
              <div className="details-body">
                <div id="detailsCategory" className="details-category" />
                <div className="details-rating">
                  <span className="stars" id="detailsStars">★★★★★</span>
                  <span className="rating-text" id="detailsRating">(0 reviews)</span>
                </div>
                <div id="detailsPrice" className="details-price" />
                <p id="detailsDesc" className="details-desc" />
                <button id="detailsAddBtn" className="add-to-cart add-full">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>

        <div id="toast" className="toast" role="status" aria-live="polite" />
      </div>
      <Footer/>
    </div>
  );
}
