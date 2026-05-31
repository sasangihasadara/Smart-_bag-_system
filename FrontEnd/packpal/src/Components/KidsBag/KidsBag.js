import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./KidsBag.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

const CART_PAGE = "/cart";              // shared cart route (opened only via header)
const STORAGE_KEY = "packPalCart";      // shared storage key

// ---------- Product Data (12 items; includes two Age 13–16) ----------
const PRODUCTS = [
  { id:"p1",category:"backpacks",age:"6-8",badge:"QUILTED",title:"Quilted Hearts Backpack",ratingText:"★★★★★",reviews:158,priceText:"LKR5000.00",price:5000,desc:"Soft quilted panels, comfy straps, fits A4 books.",img:"/images/QuiltedHeartsBackpack.jpeg",tags:"KIDS,QUILTED,Comfy straps",specs:["Material: Quilted fabric","Capacity: 14L","Weight: 520g","Fits: A4 books"] },
  { id:"p2",category:"backpacks",age:"6-8",badge:"KIDS",title:"Camera Buddy Backpack",ratingText:"★★★★★",reviews:112,priceText:"LKR2500",price:2500,desc:'Fun print, padded sleeve for 12" tablet, bottle pocket.',img:"/images/CameraBuddyBackpack.jpeg",tags:"KIDS,Camera print,Tablet sleeve",specs:["Material: Polyester","Capacity: 12L","Weight: 450g",'Sleeve: 12" tablet'] },
  { id:"p3",category:"backpacks",age:"9-12",badge:"NEW",title:"Unicorn Dream Backpack",ratingText:"★★★★☆",reviews:124,priceText:"LKR1500",price:1500,desc:"Reflective trims, twin compartments, mesh side pocket.",img:"/images/UnicornDreamBackpack.jpeg",tags:"KIDS,UNICORN,Reflective",specs:["Material: Nylon","Capacity: 16L","Weight: 500g","Safety: Reflective trims"] },
  { id:"p4",category:"backpacks",age:"3-5",badge:"SOFT",title:"Cuddle Plush Backpack",ratingText:"★★★★☆",reviews:59,priceText:"LKR1200",price:1200,desc:"Plush exterior with chest clip for a secure fit.",img:"/images/CuddlePlushBackpack.jpeg",tags:"KIDS,SOFT,Toddler",specs:["Material: Plush","Capacity: 8L","Weight: 380g","Safety: Chest clip"] },
  { id:"p5",category:"backpacks",age:"6-8",badge:"WATERPROOF",title:"Rainbow Explorer Backpack",ratingText:"★★★★★",reviews:210,priceText:"LKR2600",price:2600,desc:"Water-resistant fabric, anti-sweat straps, inner sleeve.",img:"/images/RainbowExplorerBackpack.jpeg",tags:"KIDS,WATERPROOF,Anti-sweat",specs:["Material: Water-resistant","Capacity: 15L","Weight: 480g","Comfort: Anti-sweat straps"] },
  { id:"p6",category:"backpacks",age:"9-12",badge:"GLOW",title:"Galaxy Print Backpack",ratingText:"★★★★☆",reviews:142,priceText:"LKR1900",price:1900,desc:"Reflective strips and bottle pocket for busy days.",img:"/images/GalaxyPrintBackpack.jpeg",tags:"KIDS,GLOW,Reflective",specs:["Material: Polyester","Capacity: 18L","Weight: 520g","Safety: Reflective strips"] },
  { id:"p7",category:"backpacks",age:"6-8",badge:"UNICORN",title:"Magic Unicorn Backpack",ratingText:"★★★★★",reviews:196,priceText:"LKR2200",price:2200,desc:"Sparkly panel, padded back, easy-pull zippers.",img:"/images/MagicUnicornBackpack.jpeg",tags:"KIDS,UNICORN,Sparkly",specs:["Material: PU & fabric","Capacity: 14L","Weight: 500g","Design: Sparkly panel"] },
  { id:"p8",category:"backpacks",age:"9-12",badge:"ERGONOMIC",title:"Starry Night Backpack",ratingText:"★★★★☆",reviews:117,priceText:"LKR2800",price:2800,desc:"Ergonomic straps and breathable back panel.",img:"/images/StarryNightBackpack.jpeg",tags:"KIDS,ERGONOMIC,Breathable",specs:["Material: Nylon","Capacity: 17L","Weight: 510g","Ergonomics: Breathable back panel"] },
  { id:"p9",category:"trolley",age:"6-8",badge:"ROLL-EASY",title:"Dino Wheels Trolley",ratingText:"★★★★★",reviews:98,priceText:"LKR1280",price:59.99,desc:"Quiet wheels, telescopic handle, detachable backpack module.",img:"/images/DinoWheelsTrolley.jpeg",tags:"KIDS,TROLLEY,Roll-easy",specs:["Type: Trolley","Wheels: Quiet","Handle: Telescopic","Module: Detachable backpack"] },
  { id:"p10",category:"trolley",age:"3-5",badge:"LIGHT",title:"Tiny Traveler Trolley",ratingText:"★★★★☆",reviews:62,priceText:"LKR800",price:800,desc:"Soft corners and stable base for little rollers.",img:"/images/TinyTravelerTrolley.jpeg",tags:"KIDS,TROLLEY,Lightweight",specs:["Type: Trolley","Corners: Soft","Base: Stable","Best for: Toddlers"] },
  { id:"p11",category:"backpacks",age:"13-16",badge:"TEEN",title:"Teen Pro Study Backpack",ratingText:"★★★★★",reviews:134,priceText:"LKR4200",price:4200,desc:"22L ripstop, 15″ laptop sleeve, reflective trim.",img:"/images/TeenProStudyBackpack.jpeg",tags:"TEEN,STUDY,Laptop Sleeve",specs:["Material: Ripstop nylon","Capacity: 22L","Weight: 650g",'Laptop: 15" sleeve'] },
  { id:"p12",category:"backpacks",age:"13-16",badge:"USB",title:"SprintX Teen Backpack",ratingText:"★★★★☆",reviews:91,priceText:"LKR3800",price:3800,desc:"20L capacity, USB port, ergonomic straps for long days.",img:"/images/SprintXTeenBackpack.jpeg",tags:"TEEN,USB,Ergonomic",specs:["Material: Polyester","Capacity: 20L","Weight: 600g","Feature: USB charging port"] },
];

const parsePrice = (txt = "") => {
  const match = (txt.match(/[\d.,]+/g) || []).join("");
  if (!match) return 0;
  return parseFloat(match.replace(/,/g, "")) || 0;
};

export default function KidsBags() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeAge, setActiveAge] = useState("any");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [wishlist, setWishlist] = useState(new Set());
  const [details, setDetails] = useState(null);

  // header badge: live count, passed to <Header />
  const [cartCount, setCartCount] = useState(0);

  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchAge = activeAge === "any" || p.age === activeAge;
      const q = query.trim().toLowerCase();
      const matchText =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tags || "").toLowerCase().includes(q);
      return matchCat && matchAge && matchText;
    });
  }, [activeCategory, activeAge, query]);

  useEffect(() => {
    const t = setTimeout(() => document.body.classList.add("kidsbags-mounted"), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const readCount = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        setCartCount(Array.isArray(stored) ? stored.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    readCount();

    const onUpdated = () => readCount();
    window.addEventListener("cart:updated", onUpdated);

    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) readCount();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("cart:updated", onUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Add to Cart (NO navigate)
  const addToCart = (p) => {
    const item = {
      id: Date.now(),
      name: p.title,
      price: parsePrice(p.priceText) || p.price || 0,
      quantity: 1,
      icon: "🎒",
      img: p.img,
    };

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      stored.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {}

    setCartCount((n) => n + 1);
    window.dispatchEvent(new Event("cart:updated"));
    setToast("Added to cart");
  };

  const toggleWish = (p) => {
    const next = new Set(wishlist);
    if (next.has(p.title)) {
      next.delete(p.title);
      setToast("Removed from wishlist");
    } else {
      next.add(p.title);
      setToast("Added to wishlist");
    }
    setWishlist(next);
  };

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
        style={{ left, ["--delay"]: delay, ["--dur"]: dur, ["--dx"]: drift, ["--scale"]: scale }}
        aria-hidden="true"
      />
    );
  });

  return (
    <div className="kidsbags-root">
      <Header cartCount={cartCount} />
      <div className="kb-wrap">
        {/* HERO */}
        <section className="hero" id="home" role="region" aria-label="Kids bags hero">
          <div className="dots" aria-hidden="true">{dots}</div>

          <div className="hero-content">
            <h1>Bright &amp; Tough Kids Bags</h1>
            <p>Crafted for play, school, and beyond.</p>

            <div className="search-container">
              <input
                className="search-input"
                placeholder="Search: unicorn, superhero, waterproof, trolley…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' && e.preventDefault()}
                aria-label="Search kids bags"
              />
              <button type="button" className="search-btn" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <main className="main-content" id="bags">
          <section className="filter-wrap">
            <div className="filter-row" id="categoryFilters">
              {[
                { key: "all", label: "All" },
                { key: "backpacks", label: "Backpacks" },
                { key: "trolley", label: "Trolley Bags" },
              ].map((c) => (
                <button
                  key={c.key}
                  className={`filter-btn ${activeCategory === c.key ? "active" : ""}`}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="filter-row" id="ageFilters">
              {[
                { key: "any", label: "Age: All" },
                { key: "3-5", label: "Age 3–5" },
                { key: "6-8", label: "Age 6–8" },
                { key: "9-12", label: "Age 9–12" },
                { key: "13-16", label: "Age 13–16" },
              ].map((a) => (
                <button
                  key={a.key}
                  className={`filter-btn ${activeAge === a.key ? "active" : ""}`}
                  onClick={() => setActiveAge(a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="results-info">
              Showing <strong>{filtered.length} products</strong>
            </div>
          </section>

          {/* GRID */}
          <section className="products-grid">
            {filtered.map((p) => (
              <article key={p.id} className={`product-card ${p.category}`} data-age={p.age}>
                <div className="product-media">
                  <img loading="lazy" src={p.img} alt={p.title} />
                  {p.badge && <span className="badge">{p.badge}</span>}
                </div>

                <div className="product-info">
                  <div className="product-category">{p.category === "trolley" ? "Trolley Bag" : "Backpacks"}</div>
                  <h3 className="product-title">{p.title}</h3>
                  <div className="rating">
                    {p.ratingText} <span className="rating-num">({p.reviews})</span>
                  </div>
                  <div className="price-row"><span className="price">{p.priceText}</span></div>
                  <p className="desc">{p.desc}</p>

                  <div className="actions">
                    <button className="btn btn-primary" onClick={() => addToCart(p)}>Add to Cart</button>
                    <button className="btn btn-secondary" onClick={() => setDetails(p)}>More</button>
                    <button className="btn btn-heart" title="Wishlist" onClick={() => toggleWish(p)}>
                      {wishlist.has(p.title) ? "♥" : "♡"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>

      {/* MODAL */}
      {details && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setDetails(null)}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="dTitle">
            <div className="modal-header">
              <h2 style={{ fontSize: "1.1rem", fontWeight: 900 }}>Product Details</h2>
              <button className="close-btn" aria-label="Close" onClick={() => setDetails(null)}>&times;</button>
            </div>

            <div className="detail-top">
              <img src={details.img} alt={details.title} />
              <div>
                <div className="detail-title" id="dTitle">{details.title}</div>
                <div className="detail-sub" id="dCatAge">
                  {(details.category === "trolley" ? "Trolley Bag" : "Backpacks") + " • Age " + details.age}
                </div>
                <div className="rating" id="dRating">
                  {details.ratingText} <span className="rating-num">({details.reviews})</span>
                </div>
                <div className="price" id="dPrice">{details.priceText}</div>
              </div>
            </div>

            <p id="dDesc" className="detail-desc">
              {details.desc || "Durable, lightweight, and school-ready."}
            </p>

            <ul className="detail-specs" id="dSpecs">
              {(details.specs || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>

            <div className="detail-tags" id="dTags">
              {(details.tags || "").split(",").filter(Boolean).map((t) => (
                <span key={t} className="tag-chip">{t.trim()}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn btn-primary" onClick={() => addToCart(details)}>Add to Cart</button>
              <button className="btn btn-heart" title="Wishlist" onClick={() => toggleWish(details)}>
                {wishlist.has(details.title) ? "♥" : "♡"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <Footer/>
    </div>
  );
}
