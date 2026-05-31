// src/Components/Home/Home.js
import React, { useEffect, useRef, useState } from "react";
import "./Home.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

import {
  FaShoppingBag, FaSearch, FaUser, FaUserPlus, FaShoppingCart, FaHome, FaLayerGroup,
  FaPuzzlePiece, FaTags, FaGift, FaPlay, FaBriefcase, FaSuitcase, FaChevronDown
} from "react-icons/fa";
import { FaBagShopping, FaVolumeHigh, FaVolumeXmark, FaFacebookF, FaInstagram, FaTwitter, FaPlus, FaMinus } from "react-icons/fa6";

export default function Home() {
  const headerRef = useRef(null);
  const videoRef   = useRef(null);

  const [cartItems, setCartItems] = useState([]);
  const [notice, setNotice]       = useState(null);

  const [muted, setMuted]   = useState(true);
  const [volume, setVolume] = useState(0.4);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted  = muted;
    videoRef.current.volume = volume;
  }, [muted, volume]);

  const [happy, setHappy]         = useState(0);
  const [designs, setDesigns]     = useState(0);
  const [satisfaction, setSat]    = useState(0);

  useEffect(() => {
    const animate = (target, setter, isPercent = false, duration = 2000) => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const val = target * p;
        setter(isPercent ? +val.toFixed(1) : Math.floor(val));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    animate(25855, setHappy);
    animate(1892, setDesigns);
    animate(98.7,  setSat, true);

    const bump = setInterval(() => setHappy((v) => v + Math.floor(Math.random() * 3)), 10000);
    return () => clearInterval(bump);
  }, []);

  const showNotification = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2400);
  };

  const addToCart = (name, price) => {
    setCartItems((prev) => [...prev, { name, price }]);
    showNotification(`Added ${name} to cart!`);
  };

  const cartClick = () => {
    if (!cartItems.length) return showNotification("Your cart is empty.");
    const total = cartItems.reduce((s, i) => s + i.price, 0).toFixed(2);
    showNotification(`Cart: ${cartItems.length} items — Total $${total}`);
  };

  const smoothTo = (e, selector) => {
    e.preventDefault();
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAuth = (type) => (e) => {
    e.preventDefault();
    showNotification(type === "login" ? "Login portal opening..." : "Registration form opening...");
  };

  const onDropdownClick = (title) => () => showNotification(`Browsing ${title}`);

  return (
    <div className="pph">
      <Header />
      <div className="home-page">
       
        {/* MAIN */}
        <main className="main">
          {/* HERO with background video */}
          <section className="hero" id="home">
            <video
              ref={videoRef}
              className="hero-video"
              autoPlay
              muted={muted}
              loop
              playsInline
            >
              <source src="/images/homepage_videoooo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Sound control */}
            <div className="volume-widget" role="group" aria-label="Video sound">
              <button
                className="vol-toggle"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute video" : "Mute video"}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? <FaVolumeXmark /> : <FaVolumeHigh />}
                <span className="vol-label">Sound</span>
              </button>

              <div className="vol-steps">
                <button className="vol-btn" onClick={() => { setMuted(false); setVolume(v => Math.max(0, +(v - 0.1).toFixed(2))); }} aria-label="Decrease volume" title="Volume -">
                  <FaMinus />
                </button>
                <div className="vol-meter"><div className="vol-fill" style={{ width: `${Math.round(volume * 100)}%` }} /></div>
                <button className="vol-btn" onClick={() => { setMuted(false); setVolume(v => Math.min(1, +(v + 0.1).toFixed(2))); }} aria-label="Increase volume" title="Volume +">
                  <FaPlus />
                </button>
              </div>
            </div>

            <div className="hero-content">
              <h1 className="hero-title">Smart Bags for Smart People</h1>
              <p className="hero-subtitle">
                Discover PackPal's innovative collection of bags designed for the modern lifestyle with cutting-edge
                technology and premium materials
              </p>
              <div className="hero-cta">
                <a href="#collection" className="btn btn-primary" onClick={(e) => smoothTo(e, "#collection")}>
                  <FaBagShopping /> Explore Collection
                </a>
                <a href="#our-journey" className="btn" onClick={(e) => smoothTo(e, "#our-journey")}>
                  <FaPlay /> Our Journey
                </a>
              </div>

              {/* Search */}
              <div className="hero-search">
                <form
                  id="searchFormHero"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = e.currentTarget.querySelector("#searchInputHero").value.trim();
                    if (q) showNotification(`Searching for: "${q}"`);
                  }}
                >
                  <input
                    type="text"
                    className="search-bar search-bar-hero"
                    id="searchInputHero"
                    placeholder="Search for bags..."
                  />
                  <button className="search-btn search-btn-hero" type="submit">
                    <FaSearch />
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* ===== OUR JOURNEY ===== */}
          <section className="section our-journey" id="our-journey">
            <div className="journey-container">
              <div className="journey-text">
                <h2 className="journey-title">Our Journey</h2>
                <p>
                  What began as a passion project in a small studio has evolved into a global movement.
                  PackPal was born from the belief that exceptional craftsmanship should meet
                  cutting-edge design.
                </p>
                <p>
                  Every bag tells a story of meticulous attention to detail, premium materials
                  sourced from the finest suppliers worldwide, and an unwavering commitment to sustainability.
                </p>
                <p>
                  Today, we're not just creating bags – we're crafting experiences that empower
                  individuals to carry their dreams with confidence and style.
                </p>
              </div>
              <div className="journey-image">
                <img src="/images/journey-bag.jpg" alt="PackPal bag on pedestal" />
              </div>
            </div>
          </section>

          {/* ===== New Arrivals (3) ===== */}
          <section className="section soft-bg" id="new-arrivals">
            <div className="section-container">
              <div className="section-header">
                <h2 className="section-title">New Arrivals</h2>
                <p className="section-subtitle">Latest designs that blend innovation with style</p>
              </div>

              <div className="products-grid">
                <div
                  className="product-card loading"
                  data-product="smart-backpack"
                  onClick={() => showNotification("Viewing Smart Tech Backpack details...")}
                >
                  <div className="product-image"><img src="/images/smart_bag.png" alt="Smart Tech Backpack" /></div>
                  <h3 className="product-title">Smart Tech Backpack</h3>
                  <div className="product-price">LKR 7500.00</div>
                  <p className="product-description">
                    Revolutionary backpack with built-in USB charging and anti-theft features.
                  </p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Smart Tech Backpack", 199.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>

                <div
                  className="product-card loading"
                  data-product="kids-adventure"
                  onClick={() => showNotification("Viewing Kids Adventure Pack details...")}
                >
                  <div className="product-image"><img src="/images/kids.png" alt="Kids Adventure Pack" /></div>
                  <h3 className="product-title">Kids Adventure Pack</h3>
                  <div className="product-price">LKR 650.00</div>
                  <p className="product-description">Colorful and durable backpack designed for young explorers.</p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Kids Adventure Pack", 79.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>

                <div
                  className="product-card loading"
                  data-product="designer-tote"
                  onClick={() => showNotification("Viewing Designer Tote Bag details...")}
                >
                  <div className="product-image"><img src="/images/tote.png" alt="Designer Tote Bag" /></div>
                  <h3 className="product-title">Designer Tote Bag</h3>
                  <div className="product-price">LKR 2370.00</div>
                  <p className="product-description">Spacious tote bag crafted from premium materials.</p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Designer Tote Bag", 149.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ===== Best Selling (3) ===== */}
          <section className="section soft-bg" id="best-selling">
            <div className="section-container">
              <div className="section-header">
                <h2 className="section-title">Best Selling Products</h2>
                <p className="section-subtitle">Customer favorites that have earned their reputation</p>
              </div>

              <div className="products-grid">
                <div
                  className="product-card loading"
                  data-product="signature-handbag"
                  onClick={() => showNotification("Viewing Signature Handbag details...")}
                >
                  <div className="product-image"><img src="/images/signature_handbag.jpg" alt="Signaturee Bag" /></div>
                  <h3 className="product-title">Signature Handbag</h3>
                  <div className="product-price">LKR 3500.00</div>
                  <p className="product-description">Premium leather construction and timeless design.</p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Signature Handbag", 299.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>

                <div
                  className="product-card loading"
                  data-product="professional-briefcase"
                  onClick={() => showNotification("Viewing Professional Briefcase details...")}
                >
                  <div className="product-image"><img src="/images/professional_bag.jpg" alt="professionalBag" /></div>
                  <h3 className="product-title">Professional Briefcase</h3>
                  <div className="product-price">LKR 2495.99</div>
                  <p className="product-description">Executive briefcase with multiple compartments.</p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Professional Briefcase", 249.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>

                <div
                  className="product-card loading"
                  data-product="travel-duffel"
                  onClick={() => showNotification("Viewing Travel Duffel details...")}
                >
                 <div className="product-image"><img src="/images/teaveller1.jpg" alt="traveller Bag" /></div>
                  <h3 className="product-title">Travel Duffel</h3>
                  <div className="product-price">LKR 1890.00</div>
                  <p className="product-description">Spacious duffel with weather-resistant coating.</p>
                  <button
                    className="product-btn"
                    onClick={(e) => { e.stopPropagation(); addToCart("Travel Duffel", 189.99); }}
                  >
                    <FaBagShopping /> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ===== Ratings Banner (ABOVE FOOTER) ===== */}
          <section className="rating-banner" id="ratings">
            <div className="rating-container">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon happy-icon" />
                  <div className="stat-number">{happy.toLocaleString()}</div>
                  <div className="stat-label">Happy Customers</div>
                  <div className="stat-description">
                    Satisfied clients worldwide who trust our exceptional service and continue to choose us
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon design-icon" />
                  <div className="stat-number">{designs.toLocaleString()}</div>
                  <div className="stat-label">Unique Designs</div>
                  <div className="stat-description">
                    Original, creative solutions crafted with precision and tailored to each client's vision
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon satisfaction-icon" />
                  <div className="stat-number">{satisfaction.toFixed(1)}%</div>
                  <div className="stat-label">Satisfaction Rate</div>
                  <div className="stat-description">
                    Outstanding customer satisfaction score reflecting our dedication to excellence
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ===== Floating WhatsApp (bottom-left) ===== */}
        <a
          href="https://wa.me/94713276391?text=Hi%20PackPal%2C%20I%E2%80%99m%20interested%20in%20your%20bags."
          className="whatsapp-float"
          aria-label="Chat on WhatsApp"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* WhatsApp SVG icon (no external assets needed) */}
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <path d="M19.11 17.49c-.29-.16-1.68-.9-1.94-1s-.45-.16-.64.16-.74 1-.9 1.17-.33.25-.61.09a6.63 6.63 0 0 1-1.95-1.2 7.34 7.34 0 0 1-1.35-1.68c-.14-.24 0-.37.11-.52s.25-.3.37-.45a1.73 1.73 0 0 0 .24-.41.46.46 0 0 0 0-.44c0-.13-.64-1.55-.88-2.12s-.47-.49-.64-.5h-.55a1.06 1.06 0 0 0-.76.35 3.19 3.19 0 0 0-1 2.37 5.55 5.55 0 0 0 1.18 2.95 12.7 12.7 0 0 0 4.83 4.29A11.06 11.06 0 0 0 17 20a3.69 3.69 0 0 0 2.39-.94 2.92 2.92 0 0 0 .66-1.82c0-.18-.02-.29-.09-.35z" fill="#ffffff"/>
            <path d="M26.76 5.24A12.28 12.28 0 0 0 4.65 22.07L3 29l7-1.82A12.28 12.28 0 0 0 26.76 5.24zm-2.13 17.5a9.88 9.88 0 0 1-8.26 2.7 9.83 9.83 0 0 1-3.2-.78l-.23-.09-4.15 1.08 1.11-4.06-.1-.23a9.86 9.86 0 1 1 14.83 1.38z" fill="#ffffff"/>
          </svg>
        </a>

        {/* Scoped styles for the WhatsApp button */}
        <style>{`
          .whatsapp-float{
            position: fixed;
            left: 18px;                /* bottom-left */
            bottom: 18px;
            width: 56px;
            height: 56px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: #25D366;       /* WhatsApp green */
            box-shadow: 0 8px 22px rgba(0,0,0,.22);
            text-decoration: none;
            z-index: 9999;
            transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
          }
          .whatsapp-float:hover{
            transform: translateY(-2px);
            box-shadow: 0 10px 26px rgba(0,0,0,.26);
            background: #1ebe5d;
          }
          .whatsapp-float:active{ transform: translateY(0); }
          .whatsapp-float::after{
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow: 0 0 0 0 rgba(37,211,102,.45);
            animation: wa-pulse 2.2s infinite;
            pointer-events: none;
          }
          @keyframes wa-pulse{
            0%   { box-shadow: 0 0 0 0 rgba(37,211,102,.45); }
            70%  { box-shadow: 0 0 0 16px rgba(37,211,102,0); }
            100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
          }
          @media (max-width: 420px){
            .whatsapp-float{ width: 50px; height: 50px; left: 14px; bottom: 14px; }
            .whatsapp-float svg{ width: 24px; height: 24px; }
          }
          @media (prefers-color-scheme: dark){
            .whatsapp-float{ box-shadow: 0 8px 22px rgba(0,0,0,.5); }
          }
        `}</style>

        {/* Toast */}
        {notice && <div className="notification">{notice}</div>}
      </div>
      <Footer />
    </div>
  );
}
