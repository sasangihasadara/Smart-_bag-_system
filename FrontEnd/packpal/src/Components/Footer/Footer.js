// src/Components/Footer/Footer.js
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Footer.css";

import {
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaDiscord,
  FaShieldAlt,
  FaRecycle,
  FaAward,
  FaHeadset,
  FaLock,
  FaSatelliteDish,
  FaEnvelopeOpenText,
  FaWallet,
  FaCreditCard,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcPaypal,
} from "react-icons/fa";

function Footer() {
  const particlesRef = useRef(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const wrap = particlesRef.current;
    if (!wrap) return;

    const count = Math.min(90, Math.floor(window.innerWidth / 18));
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      p.style.opacity = (0.4 + Math.random() * 0.6).toFixed(2);
      const startY = 80 + Math.random() * 40;
      const scale = (0.3 + Math.random() * 0.7).toFixed(2);
      p.style.transform = `translateY(${startY}vh) scale(${scale})`;
      wrap.appendChild(p);
      nodes.push(p);
    }

    return () => {
      nodes.forEach((n) => {
        try {
          wrap.removeChild(n);
        } catch {}
      });
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      alert("Please enter a valid email ✉️");
      return;
    }
    alert("🚀 Thanks for joining the future!");
    setEmail("");
  };

  return (
    <div className="ppf">
      <footer className="ultra-footer">
        <div className="footer-bg" aria-hidden="true" />
        <div className="particles" aria-hidden="true" ref={particlesRef} />

        {/* Newsletter */}
        <section className="cosmic-newsletter" aria-labelledby="newsletterTitle">
          <h2 className="cosmic-title" id="newsletterTitle">
            Join the Future
          </h2>
          <p className="cosmic-subtitle">
            Get exclusive access to revolutionary bag designs and cosmic deals
          </p>
          <form className="futuristic-form" noValidate onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="newsletterEmail">
              Email address
            </label>
            <input
              id="newsletterEmail"
              name="email"
              type="email"
              className="futuristic-input"
              placeholder="Enter your email address"
              required
              aria-required="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="futuristic-btn" aria-label="Subscribe to newsletter">
              <span>Subscribe</span>
            </button>
          </form>
        </section>

        {/* Main grid */}
        <div className="footer-main">
          <div className="container">
            <div className="footer-grid" role="navigation" aria-label="Footer navigation">
              {/* Brand */}
              <div className="morph-card brand-section">
                <h3 className="brand-logo">PackPal</h3>
                <p className="brand-tagline">Carry Your World, Beautifully</p>
                <p className="brand-description">
                  We’re crafting premium, sustainable bags that balance timeless style with modern utility.
                </p>
                <div className="floating-socials">
                  <a className="social-orb" href="#" aria-label="Instagram" rel="noopener">
                    <FaInstagram aria-hidden="true" />
                  </a>
                  <a className="social-orb" href="#" aria-label="TikTok" rel="noopener">
                    <FaTiktok aria-hidden="true" />
                  </a>
                  <a className="social-orb" href="#" aria-label="YouTube" rel="noopener">
                    <FaYoutube aria-hidden="true" />
                  </a>
                  <a className="social-orb" href="#" aria-label="Discord" rel="noopener">
                    <FaDiscord aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Collections */}
<div className="morph-card">
  <h4 className="section-title">Collections</h4>
  <ul className="footer-links">
    <li>
      <NavLink className="animated-link" to="/kidsbag">
        KidsBags
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/handbag">
        HandBags
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/totebag">
        ToteBags
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/clutches">
        Clutches
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/accessories">
        Accessories
      </NavLink>
    </li>
  </ul>
</div>

{/* All */}
<div className="morph-card">
  <h4 className="section-title">All</h4>
  <ul className="footer-links">
    <li>
      <NavLink className="animated-link" to="/faq">
        FAQ
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/feedback">
        Feedback
      </NavLink>
    </li>
    <li>
      <NavLink className="animated-link" to="/aboutpage">
        About Us
      </NavLink>
    </li>
   
    <li>
      <NavLink className="animated-link" to="/sizeguide">
        Size Guide
      </NavLink>
    </li>
  </ul>
</div>


              {/* Contact */}
              <div className="morph-card">
                <h4 className="section-title">Contact</h4>
                <div className="contact-grid">
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FaSatelliteDish aria-hidden="true" />
                    </div>
                    <div className="contact-title">Phone</div>
                    <div className="contact-details">
                      +94 11 234 5678
                      <br />
                      24/7 Support
                    </div>
                  </div>
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FaEnvelopeOpenText aria-hidden="true" />
                    </div>
                    <div className="contact-title">Email</div>
                    <div className="contact-details">
                      hello@packpal.com
                      <br />
                      support@packpal.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /.footer-grid */}
          </div>
        </div>

        {/* Trust badges */}
        <div className="trust-carousel" aria-label="Trust badges">
          <div className="container">
            <div className="trust-track">
              <div className="trust-badge">
                <div className="trust-icon"><FaShieldAlt /></div>
                <span>Secure Checkout</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaRecycle /></div>
                <span>Eco Materials</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaAward /></div>
                <span>Premium Quality</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaHeadset /></div>
                <span>24/7 Support</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaLock /></div>
                <span>Data Protection</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaShieldAlt /></div>
                <span>2-Year Warranty</span>
              </div>

              {/* duplicate for seamless loop */}
              <div className="trust-badge">
                <div className="trust-icon"><FaShieldAlt /></div>
                <span>Secure Checkout</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaRecycle /></div>
                <span>Eco Materials</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaAward /></div>
                <span>Premium Quality</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaHeadset /></div>
                <span>24/7 Support</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaLock /></div>
                <span>Data Protection</span>
              </div>
              <div className="trust-badge">
                <div className="trust-icon"><FaShieldAlt /></div>
                <span>2-Year Warranty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="payment-wave">
          <div className="container">
            <div className="payment-title">We accept all major payment methods</div>
            <div className="payment-icons" role="list" aria-label="Payment methods">
              <div className="payment-icon" role="listitem" aria-label="Visa"><FaCcVisa /></div>
              <div className="payment-icon" role="listitem" aria-label="Mastercard"><FaCcMastercard /></div>
              <div className="payment-icon" role="listitem" aria-label="American Express"><FaCcAmex /></div>
              <div className="payment-icon" role="listitem" aria-label="PayPal"><FaCcPaypal /></div>
              <div className="payment-icon" role="listitem" aria-label="Credit Card"><FaCreditCard /></div>
              <div className="payment-icon" role="listitem" aria-label="Wallet"><FaWallet /></div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="container">
            <div className="bottom-content">
              <div className="copyright">© {new Date().getFullYear()} PackPal. All rights reserved.</div>
              <div className="legal-links">
                <a className="legal-link" href="#">Terms</a>
                <a className="legal-link" href="#">Privacy</a>
                <a className="legal-link" href="#">Cookies</a>
                <a className="legal-link" href="#">Accessibility</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Footer;
