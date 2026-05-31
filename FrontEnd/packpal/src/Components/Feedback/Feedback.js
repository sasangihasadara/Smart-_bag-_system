import React, { useEffect, useMemo, useRef, useState } from "react";

import Footer from "../Footer/Footer";
import Header from "../Header/Header";
import "./Feedback.css";

export default function Feedback() {
  // ---------- React State ----------
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [emotion, setEmotion] = useState("");
  const [likes, setLikes] = useState([]); // ['quality','shipping',...]
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Refs
  const formRef = useRef(null);
  const detailsRef = useRef(null);
  const formCardRef = useRef(null);

  // ---------- Derived ----------
  const ratingText = useMemo(() => {
    const texts = [
      "Click stars to rate",
      "Poor - We can do better",
      "Fair - Room for improvement",
      "Good - Pretty satisfied",
      "Very Good - Really happy",
      "Excellent - Absolutely amazing!",
    ];
    return texts[hoverRating || rating || 0];
  }, [rating, hoverRating]);

  // ---------- Helpers ----------
  const toggleLike = (key) => {
    setLikes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const onTileClick = (type) => {
    const map = {
      product:
        "Tell us about the quality, design, durability, or any other aspects of our products...",
      service:
        "How was your customer service experience? Was our team helpful and responsive?",
      website:
        "How was your browsing and shopping experience on our website? Any suggestions for improvement?",
      suggestion:
        "Share your ideas for new products, features, or improvements you'd like to see...",
    };
    if (detailsRef.current) {
      detailsRef.current.placeholder =
        map[type] || "Share your detailed feedback with us...";
      detailsRef.current.focus();
    }
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ---------- Set stats immediately ----------
  useEffect(() => {
    const numbers = Array.from(document.querySelectorAll(".stat-number"));
    numbers.forEach((el) => {
      const target = parseFloat(el.dataset.target || "0");
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      el.textContent =
        (target > 100 ? Math.floor(target).toLocaleString() : target.toFixed(decimals)) +
        suffix;
    });
  }, []);

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (["1", "2", "3", "4", "5"].includes(e.key)) {
          e.preventDefault();
          setRating(parseInt(e.key, 10));
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ---------- Submit ----------
  const onSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(formRef.current);
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const order = (fd.get("order") || "").toString().trim();
    const details = (fd.get("details") || "").toString().trim();
    const recommend = (fd.get("recommend") || "").toString();

    if (!name || !email || !details || rating === 0) {
      formCardRef.current?.classList.add("shake-once");
      setTimeout(() => formCardRef.current?.classList.remove("shake-once"), 600);
      return;
    }

    setSubmitting(true);

    const payload = {
      name,
      email,
      order,
      rating,
      emotion,
      likes,
      details,
      recommend,
    };

    try {
      // await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      formCardRef.current?.classList.add("dimmed");
      setTimeout(() => {
        setShowSuccess(true);
        setTimeout(() => {
          formRef.current?.reset();
          setRating(0);
          setHoverRating(0);
          setEmotion("");
          setLikes([]);
          setShowSuccess(false);
          formCardRef.current?.classList.remove("dimmed");
        }, 2500);
      }, 300);
    } catch (err) {
      console.error(err);
      formCardRef.current?.classList.add("shake-once");
      setTimeout(() => formCardRef.current?.classList.remove("shake-once"), 600);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Floating dots ----------
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
        style={{
          left,
          ["--delay"]: delay,
          ["--dur"]: dur,
          ["--dx"]: drift,
          ["--scale"]: scale,
        }}
        aria-hidden="true"
      />
    );
  });

  return (
    <div className="feedback-page">{/* <-- SCOPING WRAPPER */}
      

      {/* Hero */}
      <section className="hero" aria-labelledby="feedback-title">
        <Header/>
        <div className="dots" aria-hidden="true">{dots}</div>
        
        <div className="hero-content">
          <h1 id="feedback-title">Your Feedback Matters</h1>
          <p>
            Help us create the perfect bag experience. Share your thoughts and shape the
            future of PackPal.
          </p>
        </div>
      </section>

      {/* Main */}
      <main className="main-container">
        {/* Stats */}
        <section className="stats-section" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="stats-title">Customer Satisfaction Overview</h2>
          <div className="stats-grid" role="list">
            <div className="stat-item" role="listitem" aria-label="Average rating">
              <div className="stat-number" data-target="4.8" data-decimals="1">0</div>
              <div className="stat-label">Average Rating</div>
            </div>
            <div className="stat-item" role="listitem" aria-label="Total reviews">
              <div className="stat-number" data-target="2847" data-decimals="0">0</div>
              <div className="stat-label">Total Reviews</div>
            </div>
            <div className="stat-item" role="listitem" aria-label="Satisfaction percentage">
              <div className="stat-number" data-target="96" data-suffix="%" data-decimals="0">0</div>
              <div className="stat-label">% Satisfaction</div>
            </div>
            <div className="stat-item" role="listitem" aria-label="Average response time">
              <div className="stat-number" data-target="24" data-suffix="h" data-decimals="0">0</div>
              <div className="stat-label">Response Time (hrs)</div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <div className="feedback-grid">
          {/* Form */}
          <section className="feedback-form-card" aria-labelledby="form-heading" ref={formCardRef}>
            <div className="form-header">
              <h2 id="form-heading">Share Your Experience</h2>
              <p>Your feedback helps us improve and serve you better</p>
            </div>

            <form id="feedbackForm" ref={formRef} noValidate aria-describedby="ratingText" onSubmit={onSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Your Name</label>
                <input id="name" name="name" type="text" className="form-input" placeholder="Enter your full name" required autoComplete="name" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" className="form-input" placeholder="your.email@example.com" required autoComplete="email" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="order">Order Number (Optional)</label>
                <input id="order" name="order" type="text" className="form-input" placeholder="#PAC-2025-001234" autoComplete="off" />
              </div>

              {/* Stars */}
              <div className="rating-container" aria-live="polite">
                <div className="rating-title" id="ratingLabel">Rate Your Experience</div>
                <div className="star-rating" id="starRating" role="radiogroup" aria-labelledby="ratingLabel" onMouseLeave={() => setHoverRating(0)}>
                  {[1,2,3,4,5].map((n)=>(
                    <button
                      type="button"
                      key={n}
                      className={`star ${((hoverRating || rating) >= n) ? "active" : ""}`}
                      data-rating={n}
                      role="radio"
                      aria-label={`${n} star${n>1?"s":""}`}
                      aria-checked={rating===n}
                      onMouseEnter={()=> setHoverRating(n)}
                      onClick={()=> setRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="rating-text" id="ratingText">{ratingText}</div>
              </div>

              {/* Emojis */}
              <div className="emoji-wrap">
                <div className="rating-title">How do you feel about our service?</div>
                <div className="emoji-rating" aria-label="Emoji rating">
                  {[
                    ["angry","😠","Very Dissatisfied"],
                    ["sad","😞","Dissatisfied"],
                    ["neutral","😐","Neutral"],
                    ["happy","😊","Satisfied"],
                    ["love","😍","Very Satisfied"],
                  ].map(([key,icon,label])=>(
                    <button
                      type="button"
                      key={key}
                      className={`emoji ${emotion===key ? "selected" : ""}`}
                      data-emotion={key}
                      title={label}
                      aria-pressed={emotion===key}
                      onClick={()=> setEmotion(key)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pills */}
              <div className="form-group">
                <label className="form-label">What did you like most? (Select all that apply)</label>
                <div className="quick-feedback">
                  {[
                    ["quality","Product Quality"],
                    ["shipping","Fast Shipping"],
                    ["packaging","Packaging"],
                    ["customer-service","Customer Service"],
                    ["website","Website Experience"],
                    ["pricing","Fair Pricing"],
                  ].map(([key,label])=>(
                    <span
                      key={key}
                      className={`feedback-pill ${likes.includes(key) ? "selected" : ""}`}
                      data-feedback={key}
                      role="button"
                      tabIndex={0}
                      onClick={()=> toggleLike(key)}
                      onKeyDown={(e)=> (e.key==="Enter" || e.key===" ") && toggleLike(key)}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="details">Detailed Feedback</label>
                <textarea
                  id="details"
                  name="details"
                  ref={detailsRef}
                  className="form-input form-textarea"
                  placeholder="Tell us about your experience with PackPal. What did you love? What could we improve?"
                  required
                />
              </div>

              <div className="form-group">
                <span className="form-label">Would you recommend PackPal to friends?</span>
                <div className="radio-row">
                  <label className="radio"><input type="radio" name="recommend" value="yes" /> <span>Absolutely!</span></label>
                  <label className="radio"><input type="radio" name="recommend" value="maybe" /> <span>Maybe</span></label>
                  <label className="radio"><input type="radio" name="recommend" value="no" /> <span>Probably not</span></label>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                <span id="btnText">{submitting ? "Submitting..." : "Submit Feedback"}</span>
              </button>
            </form>

            {showSuccess && (
              <div className="success-animation" id="successAnimation" role="status" aria-live="polite" style={{display:'block'}}>
                <div className="success-icon">✅</div>
                <h3 className="success-title">Thank You!</h3>
                <p className="success-desc">Your feedback has been submitted successfully. We appreciate your time and input!</p>
              </div>
            )}
          </section>

          {/* Reviews */}
          <aside className="reviews-card" aria-labelledby="reviews-heading">
            <div className="reviews-header">
              <h2 id="reviews-heading">Customer Reviews</h2>
              <div className="overall-rating" aria-label="Overall rating 4.8 out of 5">
                <span className="rating-number">4.8</span>
                <div>
                  <div className="rating-stars" aria-hidden="true">★★★★★</div>
                  <div className="rating-count">Based on 2,847 reviews</div>
                </div>
              </div>
            </div>

            <div className="reviews-list">
              {[
                { initials:"MJ", name:"Michael Johnson", date:"1 week ago", stars:"★★★★★", text:"“The carbon fiber wallet exceeded my expectations. Sleek design, perfect size, and the RFID protection gives me peace of mind. Worth every penny!”" },
                { initials:"SJ", name:"Sophia Jones", date:"2 days ago", stars:"★★★★★", text:"“The PackPal leather tote is gorgeous—buttery soft and surprisingly spacious. The stitching is flawless and the color hasn’t faded at all.”" },
                { initials:"RK", name:"Rajesh Kumar", date:"4 days ago", stars:"★★★★☆", text:"“Messenger bag feels premium. Buckles are sturdy, compartments are smart. I just wish the shoulder pad was a bit thicker.”" },
                { initials:"NP", name:"Nethmi Perera", date:"1 day ago", stars:"★★★★★", text:"“The bag organizer is a life saver! I can find my keys and lipstick instantly. Fits perfectly in my medium tote.”" },
                { initials:"LB", name:"Lucas Brown", date:"2 weeks ago", stars:"★★★★☆", text:"“Metro Backpack handled a heavy rain—laptop stayed dry. Shipping was a day late, but the quality makes up for it.”" },
                { initials:"EL", name:"Emma Lopez", date:"3 days ago", stars:"★★★★★", text:"“The bag organizer is a game changer! Everything has its place now and I can find items instantly. Great quality materials and perfect fit.”" },
                { initials:"DW", name:"David Wilson", date:"5 days ago", stars:"★★★★☆", text:"“Great selection of accessories. The keychain tracker has saved me multiple times already. Only minor issue was shipping took a day longer than expected.”" },
                { initials:"AL", name:"Amanda Lee", date:"1 week ago", stars:"★★★★★", text:"“Outstanding customer service! Had an issue with my order and they resolved it within hours. The Italian leather belt is absolutely gorgeous.”" },
              ].map((r, i)=>(
                <div className="review" key={i}>
                  <div className="review-header">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">{r.initials}</div>
                      <div>
                        <div className="reviewer-name">{r.name}</div>
                        <div className="review-date">{r.date}</div>
                      </div>
                    </div>
                    <div className="review-rating">{r.stars}</div>
                  </div>
                  <p className="review-text">{r.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Interactive tiles */}
        <section className="interactive-section" aria-labelledby="types-heading">
          <h2 id="types-heading" className="stats-title">Choose Your Feedback Type</h2>
          <div className="feedback-types">
            <div className="feedback-type" onClick={()=> onTileClick("product")}>
              <span className="feedback-type-icon">📦</span>
              <h3>Product Feedback</h3>
              <p>Share your thoughts about our bags and accessories</p>
            </div>
            <div className="feedback-type" onClick={()=> onTileClick("service")}>
              <span className="feedback-type-icon">🎯</span>
              <h3>Service Experience</h3>
              <p>Tell us about your customer service experience</p>
            </div>
            <div className="feedback-type" onClick={()=> onTileClick("website")}>
              <span className="feedback-type-icon">💻</span>
              <h3>Website Feedback</h3>
              <p>Help us improve your online shopping experience</p>
            </div>
            <div className="feedback-type" onClick={()=> onTileClick("suggestion")}>
              <span className="feedback-type-icon">💡</span>
              <h3>Suggestions</h3>
              <p>Share ideas for new products or improvements</p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating button */}
      <button
        className="floating-feedback"
        type="button"
        onClick={() => formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        aria-label="Jump to feedback form"
      >
        💬 Quick Feedback
      </button>

      <Footer/>
    </div>
  );
}
