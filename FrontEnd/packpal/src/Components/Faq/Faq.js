import React, { useEffect } from "react";
import "./Faq.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

export default function Faq() {
  useEffect(() => {
    const tabs = document.querySelectorAll(".faq-wrap .category-tab");
    const categories = document.querySelectorAll(".faq-wrap .faq-category");
    const searchInput = document.querySelector(".faq-wrap #faqSearch"); // (not present now; safely null)
    const searchBtn   = document.querySelector(".faq-wrap #searchButton"); // (not present now; safely null)
    const noResults   = document.querySelector(".faq-wrap #noResults");

    // —— Helpers
    const clearHighlights = () => {
      document
        .querySelectorAll(".faq-wrap .faq-question, .faq-wrap .faq-answer")
        .forEach((el) => {
          el.innerHTML = el.textContent;
        });
    };

    const showCategory = (id) => {
      categories.forEach((c) => c.classList.remove("active"));
      tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
      const tab = Array.from(tabs).find((t) => t.dataset.target === id);
      const panel = document.getElementById(id);
      if (tab && panel) {
        panel.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        window.history.replaceState(null, "", `#${id}`);
      }
      // Clear search state (no inputs now; guards keep this safe)
      clearHighlights();
      if (searchInput) searchInput.value = "";
      if (noResults) noResults.style.display = "none";
    };

    const closeItem = (item) => {
      const answer = item.querySelector(".faq-answer");
      const btn = item.querySelector(".faq-question");
      item.classList.remove("open");
      btn?.setAttribute("aria-expanded", "false");
      if (answer) answer.style.maxHeight = 0;
    };

    const openItem = (item) => {
      const answer = item.querySelector(".faq-answer");
      const btn = item.querySelector(".faq-question");
      item.classList.add("open");
      btn?.setAttribute("aria-expanded", "true");
      if (answer) answer.style.maxHeight = answer.scrollHeight + "px";
    };

    const accordionCloseSiblings = (item) => {
      const container = item?.parentElement;
      container?.querySelectorAll(".faq-item.open").forEach((openItem) => {
        if (openItem !== item) closeItem(openItem);
      });
    };

    const toggleItem = (item) => {
      if (item.classList.contains("open")) closeItem(item);
      else {
        accordionCloseSiblings(item);
        openItem(item);
      }
    };

    const highlight = (el, term) => {
      const re = new RegExp("(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      el.innerHTML = el.textContent.replace(re, "<mark>$1</mark>");
    };

    // —— Tab interactions
    const tabClickHandlers = [];
    tabs.forEach((tab, i) => {
      tab.style.animation = `fadeInUp .6s ease-out ${0.8 + i * 0.1}s both`;
      const onClick = () => showCategory(tab.dataset.target);
      const onKey = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showCategory(tab.dataset.target);
        }
      };
      tab.addEventListener("click", onClick);
      tab.addEventListener("keydown", onKey);
      tabClickHandlers.push([tab, onClick, onKey]);
    });

    // —— FAQ interactions
    const faqItems = document.querySelectorAll(".faq-wrap .faq-item");
    const faqHandlers = [];
    faqItems.forEach((item, idx) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(18px)";
      item.style.transition = "all .5s ease";
      setTimeout(() => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      }, 90 * idx);

      const q = item.querySelector(".faq-question");
      const onClick = () => toggleItem(item);
      const onKey = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleItem(item);
        }
      };
      q?.addEventListener("click", onClick);
      q?.addEventListener("keydown", onKey);
      faqHandlers.push([q, onClick, onKey]);
    });

    // Auto-open first in visible category
    const firstOpen = document.querySelector(".faq-wrap .faq-category.active .faq-item");
    if (firstOpen) openItem(firstOpen);

    // —— Search in active category (kept safe even if inputs don’t exist)
    const runSearch = () => {
      const term = (searchInput?.value || "").trim().toLowerCase();
      clearHighlights();
      const active = document.querySelector(".faq-wrap .faq-category.active");
      const items = active ? active.querySelectorAll(".faq-item") : [];
      let hasResults = false;

      items.forEach((item) => {
        const q = item.querySelector(".faq-question");
        const a = item.querySelector(".faq-answer");
        const qText = (q?.textContent || "").toLowerCase();
        const aText = (a?.textContent || "").toLowerCase();

        if (!term) {
          item.style.display = "block";
          item.style.borderColor = "#f0f0f0";
          return;
        }
        if (qText.includes(term) || aText.includes(term)) {
          item.style.display = "block";
          item.style.borderColor = "var(--g1)";
          hasResults = true;
          if (q) highlight(q, term);
          if (a) highlight(a, term);
        } else {
          item.style.display = "none";
        }
      });

      if (noResults) noResults.style.display = term && !hasResults ? "block" : "none";
    };

    const onSearchInput = () => runSearch();
    const onSearchClick = () => runSearch();

    searchInput?.addEventListener("input", onSearchInput);
    searchBtn?.addEventListener("click", onSearchClick);

    // —— Reveal on scroll (stat/help cards)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = document.querySelectorAll(".faq-wrap .help-card, .faq-wrap .stat-card");
    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(24px)";
      card.style.transition = "all .6s ease";
      revealObserver.observe(card);
    });

    // —— Counter animation
    const counters = document.querySelectorAll(".faq-wrap .stat-number");
    const countersObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = Number(el.dataset.target || 0);
          const suffix = el.dataset.suffix || "";
          let current = 0;
          const step = Math.max(1, Math.ceil(target / (2000 / 16)));
          const tick = () => {
            current = Math.min(target, current + step);
            el.textContent = current + suffix;
            if (current < target) requestAnimationFrame(tick);
          };
          tick();
          countersObserver.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => countersObserver.observe(c));

    // Cleanup
    return () => {
      tabClickHandlers.forEach(([tab, onClick, onKey]) => {
        tab.removeEventListener("click", onClick);
        tab.removeEventListener("keydown", onKey);
      });
      faqHandlers.forEach(([q, onClick, onKey]) => {
        q?.removeEventListener("click", onClick);
        q?.removeEventListener("keydown", onKey);
      });
      searchInput?.removeEventListener("input", onSearchInput);
      searchBtn?.removeEventListener("click", onSearchClick);
    };
  }, []);

  return (
    <main className="faq-wrap">
      <Header/>
      {/* Accessories-style hero banner (no search) */}
      <section className="hero">
        {/* Floating dots layer */}
        <div className="dots" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => {
            const left   = `${Math.random() * 100}%`;
            const delay  = `${-Math.random() * 12}s`;
            const dur    = `${10 + Math.random() * 10}s`;
            const drift  = `${(Math.random() * 160 - 80).toFixed(0)}px`;
            const scale  = (0.7 + Math.random() * 0.8).toFixed(2);
            const sizeCls= Math.random() < 0.18 ? "lg" : (Math.random() < 0.5 ? "sm" : "");
            return (
              <span
                key={i}
                className={`dot ${sizeCls}`}
                style={{ left, "--delay": delay, "--dur": dur, "--dx": drift, "--scale": scale }}
              />
            );
          })}
        </div>

        <div className="hero-content">
          <h1>FAQ</h1>
          <p>Your bag doubts, unzipped! Check out our FAQ before you shop.</p>
          {/* (search removed as requested) */}
        </div>
      </section>

      <div className="container">
        {/* Tabs */}
        <nav className="category-tabs" role="tablist" aria-label="FAQ Categories">
          <button className="category-tab" role="tab" aria-selected="true" data-target="general">
            General
          </button>
          <button className="category-tab" role="tab" aria-selected="false" data-target="products">
            Products
          </button>
          <button className="category-tab" role="tab" aria-selected="false" data-target="shipping">
            Shipping
          </button>
          <button className="category-tab" role="tab" aria-selected="false" data-target="returns">
            Returns
          </button>
          <button className="category-tab" role="tab" aria-selected="false" data-target="account">
            Account
          </button>
        </nav>

        {/* FAQ Content */}
        <section className="faq-section">
          {/* General */}
          <div id="general" className="faq-category active" role="tabpanel" aria-labelledby="General">
            <h2 className="category-title">General Questions</h2>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What are your shipping options and costs?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  We offer Standard (5–7 days, $5.99), Express (2–3 days, $12.99), and Overnight ($24.99).
                  Free standard shipping on orders over $75. International shipping to 180+ countries starting at $15.99.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> How can I track my order?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  We email a tracking number when your order ships. Track via your PackPal account, our tracking page,
                  or the carrier site. Optional SMS updates are available if you opt in.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Do you ship internationally?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  Yes—over 180 countries. International deliveries usually take 7–14 business days. Local duties/taxes may apply;
                  we show duty estimates at checkout.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What happens if my package is lost or damaged?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  All shipments are insured. If lost/damaged, contact us with photos. We’ll file a claim and send a replacement
                  or refund within 24–48 hours after verification.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Can I change my shipping address after ordering?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  If your order hasn’t shipped, yes—contact support. After shipment, we may be able to redirect with the carrier
                  (fees may apply).
                </p>
              </div>
            </div>
          </div>

          {/* Returns */}
          <div id="returns" className="faq-category" role="tabpanel">
            <h2 className="category-title">Returns & Exchanges</h2>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What’s your return policy?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  30-day hassle-free returns. Items must be in original condition with tags. Free return shipping in the US;
                  international customers cover return postage.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> How do I start a return or exchange?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  Log into your account and click “Return Item,” or contact support. We’ll send a prepaid label and process your
                  return within 3–5 business days of receipt.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Can I exchange for a different size or color?
              </div>
              <div className="faq-answer" role="region">
                <p>Yes—free within 30 days, subject to availability. We’ll charge or refund any price difference.</p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What if I received the wrong item?
              </div>
              <div className="faq-answer" role="region">
                <p>Our mistake—we’ll reship the correct item via expedited shipping at no cost and arrange pickup for the wrong item.</p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Do personalized items qualify for returns?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  Only if there’s a defect or customization error on our side. We share digital proofs before production to ensure accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Account */}
          <div id="account" className="faq-category" role="tabpanel">
            <h2 className="category-title">Account & Orders</h2>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> How do I create a PackPal account?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  Click “Sign Up” on the homepage or during checkout. Benefits: order tracking, exclusive discounts, early sale access,
                  faster checkout.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Can I modify or cancel my order?
              </div>
              <div className="faq-answer" role="region">
                <p>
                  Within 2 hours of placing the order—contact us ASAP. After that, fulfillment begins and changes might not be possible.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What payment methods do you accept?
              </div>
              <div className="faq-answer" role="region">
                <p>Visa, MasterCard, AmEx, Discover, PayPal, Apple Pay, Google Pay, and BNPL (Klarna/Afterpay). 256-bit SSL.</p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> How do I reset my password?
              </div>
              <div className="faq-answer" role="region">
                <p>Click “Forgot Password” on the login page. We’ll email a secure link (expires in 24 hours). Check spam if you don’t see it.</p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> How do I update account info?
              </div>
              <div className="faq-answer" role="region">
                <p>Go to Account Settings to update email, password, addresses, payment methods, and preferences. Changes apply immediately.</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div id="products" className="faq-category" role="tabpanel">
            <h2 className="category-title">Products</h2>
            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> What materials do PackPal bags use?
              </div>
              <div className="faq-answer" role="region">
                <p>Premium vegan leather, durable nylon, and recycled canvas depending on collection. Product pages list exact specs.</p>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div id="shipping" className="faq-category" role="tabpanel">
            <h2 className="category-title">Shipping</h2>
            <div className="faq-item">
              <div className="faq-question" tabIndex="0" aria-expanded="false">
                <span className="q-ico">❓</span> Do you offer same-day delivery?
              </div>
              <div className="faq-answer" role="region">
                <p>Available in select cities for orders before 12:00 PM local time. Options appear at checkout when eligible.</p>
              </div>
            </div>
          </div>

          {/* No results */}
          <div id="noResults" className="no-results" aria-live="polite">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try different keywords or browse the categories above.</p>
          </div>
        </section>

        {/* Stats */}
        <section className="stats-section" aria-label="Help statistics">
          <div className="stat-card">
            <div className="stat-number" data-target="2" data-suffix="min">2min</div>
            <div className="stat-label">Avg Search Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" data-target="95" data-suffix="%">95%</div>
            <div className="stat-label">Questions Answered</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" data-target="24" data-suffix="/7">24/7</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" data-target="50" data-suffix="+">50+</div>
            <div className="stat-label">Topics Covered</div>
          </div>
        </section>

        {/* Help */}
        <section className="help-section" aria-label="Need more help">
          <h2 className="help-title">Still Need Help?</h2>
          <p style={{ color: "var(--muted)", fontSize: "1.1rem", marginBottom: 12 }}>
            Can’t find the answer? Our support team is here for you.
          </p>

          <div className="help-grid">
            <div className="help-card">
              <div className="help-icon">💬</div>
              <h3>Live Chat</h3>
              <p>Instant answers 24/7. Average response time under 1 minute.</p>
              <button className="help-btn" id="liveChatBtn">Start Chat</button>
            </div>

            <div className="help-card">
              <div className="help-icon">📞</div>
              <h3>Phone Support</h3>
              <p>Talk to a specialist for complex questions or urgent help.</p>
              <a href="tel:+15551234567" className="help-btn">Call Now</a>
            </div>

            <div className="help-card">
              <div className="help-icon">✉️</div>
              <h3>Email Support</h3>
              <p>Perfect for detailed, non-urgent inquiries and documentation.</p>
              <a href="mailto:support@packpal.com" className="help-btn">Send Email</a>
            </div>

            <div className="help-card">
              <div className="help-icon">📋</div>
              <h3>Contact Form</h3>
              <p>Send structured requests (product questions, feedback, etc.).</p>
              <a href="#" className="help-btn">Contact Form</a>
            </div>
          </div>
        </section>
      </div>
      <Footer/>
    </main>
  );
}
