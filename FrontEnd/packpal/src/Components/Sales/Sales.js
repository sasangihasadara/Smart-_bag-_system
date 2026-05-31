// src/Components/Sales/Sales.js
import React, { useEffect, useRef } from "react";
import "./Sales.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

function Sales() {
  const rootRef = useRef(null);

  useEffect(() => {
    // ---------- Scoped helpers ----------
    const $  = (q, el = rootRef.current) => (el ? el.querySelector(q) : null);
    const $$ = (q, el = rootRef.current) =>
      el ? Array.from(el.querySelectorAll(q)) : [];

    const fmt = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "LKR",
    });

    // ---------- Mobile menu ----------
    const menuBtn = $("#menuBtn");
    const mobileMenu = $("#mobileMenu");
    const onMenuClick = () => mobileMenu?.classList.toggle("open");
    const onMobileLink = (e) => {
      if (e.target.tagName === "A") mobileMenu?.classList.remove("open");
    };
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener("click", onMenuClick);
      mobileMenu.addEventListener("click", onMobileLink);
    }

    // ---------- Countdown ----------
    const hero = $(".hero");
    const dEl = $("#d"),
      hEl = $("#h"),
      mEl = $("#m"),
      sEl = $("#s");

    let tickInterval = null;
    if (hero && dEl && hEl && mEl && sEl) {
      const endAttr = hero.getAttribute("data-end");
      const targetEnd = endAttr
        ? new Date(endAttr)
        : new Date(
            Date.now() + (3 * 24 * 60 * 60 + 14 * 60 * 60 + 27 * 60 + 45) * 1000
          );

      const tick = () => {
        const t = targetEnd - Date.now();
        if (t <= 0) {
          dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = "00";
          const timer = $(".timer");
          if (timer) {
            timer.innerHTML =
              '<div class="tbox"><span class="num">SALE</span><span class="lab">ENDED</span></div>';
          }
          clearInterval(tickInterval);
          return;
        }
        const d = Math.floor(t / 864e5);
        const h = Math.floor((t % 864e5) / 36e5);
        const m = Math.floor((t % 36e5) / 6e4);
        const s = Math.floor((t % 6e4) / 1e3);
        dEl.textContent = String(d).padStart(2, "0");
        hEl.textContent = String(h).padStart(2, "0");
        mEl.textContent = String(m).padStart(2, "0");
        sEl.textContent = String(s).padStart(2, "0");
      };

      tickInterval = setInterval(tick, 1000);
      tick();
    }

    // ---------- Price formatting (LKR) ----------
    $$("[data-now]").forEach((el) => {
      const v = Number(el.dataset.now);
      if (!Number.isNaN(v)) el.textContent = fmt.format(v);
    });
    $$("[data-was]").forEach((el) => {
      const v = Number(el.dataset.was);
      if (!Number.isNaN(v)) el.textContent = fmt.format(v);
    });

    // ---------- Scroll reveal ----------
    const srEls = $$(".sr");
    let srObs = null;
    if ("IntersectionObserver" in window && srEls.length) {
      srObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("show");
              srObs?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
      );
      srEls.forEach((el) => srObs?.observe(el));
    } else {
      srEls.forEach((el) => el.classList.add("show"));
    }

    // ---------- Parallax (gentle) ----------
    const onScroll = () => {
      if (!hero) return;
      const y = window.scrollY * -0.2;
      hero.style.transform = `translateY(${y}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---------- Cart (persisted) ----------
    const cartBtn = $("#cartBtn");
    const cartCount = $("#cartCount");
    const CART_KEY = "packpal_cart_v1";
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      cart = [];
    }
    const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
    const total = () => cart.reduce((a, c) => a + Number(c.price || 0), 0);
    const refreshBadge = () => {
      if (!cartCount) return;
      const n = cart.length;
      cartCount.hidden = n === 0;
      if (n > 0) cartCount.textContent = n;
    };
    refreshBadge();

    const toast = (msg) => {
      // toast is global on purpose (overlays)
      const t = document.createElement("div");
      t.className = "sales-toast"; // scoped class name
      t.innerHTML = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add("show"));
      setTimeout(() => {
        t.classList.remove("show");
        setTimeout(() => t.remove(), 200);
      }, 2600);
    };

    const showCart = () => {
      if (!cart.length) {
        toast("🛒 Your cart is empty.");
        return;
      }
      const m = document.createElement("div");
      m.className = "sales-modal";
      m.innerHTML = `
        <div class="modal-card" role="dialog" aria-label="Cart Summary">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">
            <h2 style="margin:0">Your Cart (${cart.length} items)</h2>
            <button class="x" aria-label="Close">×</button>
          </div>
          <div class="lines"></div>
          <div style="margin-top:1rem;border-top:2px solid var(--brand);padding-top:.75rem;display:flex;justify-content:space-between;font-weight:900;color:var(--brand)">
            <span>Total</span><span>${fmt.format(total())}</span>
          </div>
          <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn" id="checkout" style="flex:1">Proceed to Checkout</button>
            <button class="btn" id="clear" style="flex:1;background:#6b7280">Clear Cart</button>
          </div>
        </div>`;
      document.body.appendChild(m);

      const lines = m.querySelector(".lines");
      if (lines) {
        lines.innerHTML = cart
          .map(
            (i) => `
          <div class="row">
            <span>${i.name || i.id || "Item"}</span>
            <span style="font-weight:800;color:var(--brand)">${fmt.format(
              Number(i.price || 0)
            )}</span>
          </div>`
          )
          .join("");
      }
      requestAnimationFrame(() => m.classList.add("show"));

      const closeByClick = (e) => {
        if (
          e.target === m ||
          (e.target && e.target.classList && e.target.classList.contains("x"))
        )
          m.remove();
      };
      m.addEventListener("click", closeByClick);

      const checkout = m.querySelector("#checkout");
      const clearBtn = m.querySelector("#clear");
      if (checkout)
        checkout.onclick = () => {
          alert(
            `Proceeding to checkout with ${cart.length} items. Total: ${fmt.format(
              total()
            )}`
          );
          m.remove();
        };
      if (clearBtn)
        clearBtn.onclick = () => {
          if (window.confirm("Remove all items from cart?")) {
            cart = [];
            saveCart();
            refreshBadge();
            m.remove();
            toast("🗑️ Cart cleared");
          }
        };
    };

    const onCartClick = () => showCart();
    cartBtn?.addEventListener("click", onCartClick);

    const addToCart = (id, price, name) => {
      cart.push({ id, price: Number(price), name });
      saveCart();
      refreshBadge();
      toast(
        `✅ <strong>${name || id}</strong> added — ${fmt.format(Number(price || 0))}`
      );
    };

    // Bind all "add" buttons within this page
    $$(".add").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id || "item";
        const price = Number(btn.dataset.price || 0);
        const h3 = btn.closest(".card")?.querySelector("h3");
        const name = h3 ? h3.textContent.trim() : id;
        addToCart(id, price, name);
      });
    });

    // Newsletter (dummy)
    const nlForm = $("#nlForm");
    const onNlSubmit = (e) => {
      e.preventDefault();
      const email = $("#nlEmail")?.value || "";
      if (!email) return;
      alert(`Subscribed: ${email}`);
      e.target.reset();
    };
    nlForm?.addEventListener("submit", onNlSubmit);

    // ---------- Cleanup ----------
    return () => {
      if (menuBtn && mobileMenu) {
        menuBtn.removeEventListener("click", onMenuClick);
        mobileMenu.removeEventListener("click", onMobileLink);
      }
      window.removeEventListener("scroll", onScroll);
      cartBtn?.removeEventListener("click", onCartClick);
      nlForm?.removeEventListener("submit", onNlSubmit);
      if (tickInterval) clearInterval(tickInterval);
      if (srObs) srObs.disconnect();
    };
  }, []);

  const img = (name) => `${process.env.PUBLIC_URL}/images/${name}`;

  return (
    <div className="page-wrap">
      <Header/>
      <div className="sales-page" ref={rootRef}>
        {/* Nav */}
      

        {/* Hero */}
        <header className="hero" data-end="">
          <div className="hero-inner">
            <span className="badge" aria-live="polite">🔥 MEGA SALE ALERT</span>
            <h1>UP TO 60% OFF</h1>
            <p className="sub">Exclusive deals on premium bags — limited time only!</p>
            <div className="timer" aria-label="Countdown timer">
              <div className="tbox"><span className="num" id="d">00</span><span className="lab">Days</span></div>
              <div className="tbox"><span className="num" id="h">00</span><span className="lab">Hours</span></div>
              <div className="tbox"><span className="num" id="m">00</span><span className="lab">Minutes</span></div>
              <div className="tbox"><span className="num" id="s">00</span><span className="lab">Seconds</span></div>
            </div>
          </div>
        </header>

        {/* Flash Sale */}
        <section id="flash-sale" className="section">
          <header className="section-header sr">
            <h2>⚡ Flash Sale</h2>
            <p className="muted">Grab these incredible deals before they're gone!</p>
          </header>

          <div className="grid">
            {/* Card 1 */}
            <article className="card sr">
              <span className="pill" aria-hidden="true">21 people viewing</span>
              <span className="ribbon" aria-hidden="true">HOT DEAL</span>
              <div className="img" role="img" aria-label="Adventure Pro Backpack image">
                <img src={img("adventure_pro_backpack.png")} alt="Adventure Pro Backpack" loading="lazy" decoding="async" />
              </div>
              <h3>Adventure Pro Backpack</h3>
              <div className="price">
                <span className="was" data-was="1590.99">LKR 1590.99</span>
                <span className="now" data-now="636.99">LKR 636.99</span>
                <span className="off">60% OFF</span>
              </div>
              <p className="desc">Pro-grade 40L capacity, weather-resistant, lifetime warranty. Perfect for hiking and travel.</p>

              <div className="cta-stack" aria-label="Adventure Pro actions">
                <button className="btn-status" disabled>Only 3 left</button>
                <button className="btn btn-primary add" data-id="adventure-pro" data-price="63.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>

            {/* Card 2 */}
            <article className="card sr">
              <span className="pill" aria-hidden="true">18 people viewing</span>
              <span className="ribbon" aria-hidden="true">HOT DEAL</span>
              <div className="img" role="img" aria-label="Executive Briefcase image">
                <img src={img("men_briefcase.png")} alt="Executive Briefcase" loading="lazy" decoding="async" />
              </div>
              <h3>Executive Briefcase</h3>
              <div className="price">
                <span className="was" data-was="249.99">LKR 2490.99</span>
                <span className="now" data-now="99.99">LKR 996.99</span>
                <span className="off">60% OFF</span>
              </div>
              <p className="desc">Premium leather with padded laptop bay and document organizers — sharp, durable, professional.</p>

              <div className="cta-stack" aria-label="Executive Briefcase actions">
                <button className="btn-status" disabled>Last 2 items</button>
                <button className="btn btn-primary add" data-id="executive-briefcase" data-price="99.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>

            {/* Card 3 */}
            <article className="card sr">
              <span className="pill" aria-hidden="true">15 people viewing</span>
              <span className="ribbon" aria-hidden="true">HOT DEAL</span>
              <div className="img" role="img" aria-label="Designer Handbag Set image">
                <img src={img("bagset.jpeg")} alt="Designer Handbag Set (tote, crossbody, clutch)" loading="lazy" decoding="async" />
              </div>
              <h3>Designer Handbag Set</h3>
              <div className="price">
                <span className="was" data-was="199.99">LKR 19990.99</span>
                <span className="now" data-now="79.99">LKR 7996.99</span>
                <span className="off">60% OFF</span>
              </div>
              <p className="desc">Elegant 3-piece: tote, crossbody, clutch. Premium materials. Modern design.</p>

              <div className="cta-stack" aria-label="Designer Handbag Set actions">
                <button className="btn-status" disabled>Only 5 left</button>
                <button className="btn btn-primary add" data-id="handbag-set" data-price="79.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* Bundles */}
        <section id="bundles" className="section">
          <header className="section-header sr">
            <h2>Bundle Deals</h2>
            <p className="muted">Mix and match — save even more with our bundles!</p>
          </header>

          <div className="grid">
            {/* Traveler's Bundle */}
            <article className="card bundle sr">
              <div className="bundle-media">
                <img src={img("bundle_travellers.png")} alt="Traveler's Bundle product collage" />
              </div>
              <h3>Traveler's Bundle</h3>
              <div className="cta-stack" aria-label="Traveler's Bundle actions">
                <button className="btn-status" disabled>Only 3 left</button>
                <button className="btn btn-primary add" data-id="traveler-bundle" data-price="149.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>

            {/* Complete Collection */}
            <article className="card bundle pop sr">
              <span className="bundle-badge">MOST POPULAR</span>
              <div className="bundle-media">
                <img src={img("bunddle_collection.png")} alt="Complete Collection bundle collage" />
              </div>
              <h3>Complete Collection</h3>
              <div className="cta-stack" aria-label="Complete Collection actions">
                <button className="btn-status" disabled>Last 2 items</button>
                <button className="btn btn-primary add" data-id="complete-collection" data-price="199.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>

            {/* Fitness Pack */}
            <article className="card bundle sr">
              <div className="bundle-media">
                <img src={img("bundke_fitness.png")} alt="Fitness Pack product collage" />
              </div>
              <h3>Fitness Pack</h3>
              <div className="cta-stack" aria-label="Fitness Pack actions">
                <button className="btn-status" disabled>Only 5 left</button>
                <button className="btn btn-primary add" data-id="fitness-pack" data-price="89.99" type="button">
                  Grab This Deal
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* Limited */}
        <section id="limited" className="section limited">
          <div className="banner sr">
            <h2>Exclusive Coupon Codes</h2>
            <p>Use this at checkout for bonus savings</p>
            <div className="coupon" aria-label="Coupon code SAVE25NOW">SAVE25NOW</div>
            <p>25% off your order + Free worldwide shipping</p>
          </div>

          <div className="grid container">
            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupeon_freeShipping.png")} alt="Free Express Shipping" />
              </div>
              <h3>Free Express Shipping</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>Orders over LKR 75,000 ship free with 2-day delivery.</p>
            </article>

            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupon_vip_membership.png")} alt="VIP Membership" />
              </div>
              <h3>VIP Membership</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>Early access to sales and members-only products.</p>
            </article>

            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupon_mystryyy.jpg")} alt="Mystery Gift" />
              </div>
              <h3>Mystery Gift</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>Orders LKR 150,000+ include a surprise premium accessory.</p>
            </article>

            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupon_retyrn_days.png")} alt="30-Day Returns" />
              </div>
              <h3>30-Day Returns</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>Full refunds within 30 days — no questions asked.</p>
            </article>

            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupon_warranty.png")} alt="Extended Warranty" />
              </div>
              <h3>Extended Warranty</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>3-year warranty included on all sale items.</p>
            </article>

            <article className="card sr" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="feature-media">
                <img src={img("coupon_payment.jpg")} alt="Payment Plans" />
              </div>
              <h3>Payment Plans</h3>
              <p className="desc" style={{ color: "#e5e7eb" }}>0% interest on orders LKR 100,000+ with flexible terms.</p>
            </article>
          </div>
        </section>

        
      
      </div>
      <Footer/>
    </div>
  );
}

export default Sales;
