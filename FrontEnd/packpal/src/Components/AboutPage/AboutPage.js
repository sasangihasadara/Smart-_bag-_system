import React, { useEffect } from "react";
import "./AboutPage.css";
// Header is rendered globally by your app (not here) to avoid duplicates.
import Footer from "../Footer/Footer";
import Header from "../Header/Header";

function Aboutpage() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNodes = Array.from(document.querySelectorAll(".about-page .reveal"));

    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealNodes.forEach((n) => n.classList.add("visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealNodes.forEach((n) => io.observe(n));
    }
  }, []);

  return (
    <div className="about-page">
      {/* ===== About Page Banner (single global Header sits above) ===== */}
      <section className="about-hero" aria-label="About Pack Pal banner">
        <div className="about-dots" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => {
            const left = `${Math.random() * 100}%`;
            const delay = `${-Math.random() * 12}s`;
            const dur = `${10 + Math.random() * 10}s`;
            const drift = `${(Math.random() * 160 - 80).toFixed(0)}px`;
            const scale = (0.7 + Math.random() * 0.8).toFixed(2);
            const sizeCls = Math.random() < 0.18 ? "lg" : Math.random() < 0.5 ? "sm" : "";
            return (
              <span
                key={i}
                className={`dot ${sizeCls}`}
                style={{ left, "--delay": delay, "--dur": dur, "--dx": drift, "--scale": scale }}
              />
            );
          })}
        </div>
<Header/>
        <div className="about-hero-content">
          <h1>ABOUT US</h1>
          <p>Trusted companions for life on the go—smarter details, fewer worries.</p>
        </div>
      </section>

      {/* ===== Main content card ===== */}
      <main className="container">
        <div className="content reveal">
          {/* Intro */}
          <section className="section">
            <h2>About Pack Pal</h2>
            <p>
              At Pack Pal, we believe that every journey deserves the perfect companion. Founded on the
              principle that quality bags should combine functionality, durability, and style, we've dedicated
              ourselves to creating bags that don't just carry your belongings – they enhance your entire
              experience.
            </p>
            <p>
              Whether you're a daily commuter, weekend adventurer, or global traveler, Pack Pal is designed to
              be your reliable partner. We understand that your bag is more than just an accessory; it's an
              extension of your lifestyle, a keeper of your essentials, and a silent companion through life's
              adventures.
            </p>
          </section>

          {/* Story / Timeline */}
          <section className="section reveal">
            <h2>Our Story</h2>
            <p>Every great brand has a story, and ours begins with a simple frustration and a big dream.</p>

            <div className="timeline">
              <article className="timeline-item">
                <div className="timeline-dot" aria-hidden="true"></div>
                <div className="timeline-content">
                  <div className="timeline-year">The Beginning - 2020</div>
                  <p>
                    It all started when our founder, constantly traveling for work, grew tired of bags that
                    promised durability but failed when it mattered most. After a particularly disastrous trip
                    where a poorly made bag gave way at the airport, spilling important documents everywhere,
                    the idea for Pack Pal was born.
                  </p>
                </div>
              </article>

              <article className="timeline-item">
                <div className="timeline-dot" aria-hidden="true"></div>
                <div className="timeline-content">
                  <div className="timeline-year">Research &amp; Development - 2021</div>
                  <p>
                    We spent over a year researching materials, testing designs, and gathering feedback from
                    travelers, students, and professionals. We visited factories, spoke with craftspeople, and
                    learned everything we could about what makes a bag truly exceptional.
                  </p>
                </div>
              </article>

              <article className="timeline-item">
                <div className="timeline-dot" aria-hidden="true"></div>
                <div className="timeline-content">
                  <div className="timeline-year">First Collection - 2022</div>
                  <p>
                    After countless prototypes and rigorous testing, we launched our first collection. The
                    response was overwhelming – customers loved the thoughtful design, premium materials, and
                    attention to detail that went into every Pack Pal bag.
                  </p>
                </div>
              </article>

              <article className="timeline-item">
                <div className="timeline-dot" aria-hidden="true"></div>
                <div className="timeline-content">
                  <div className="timeline-year">Growing Community - 2023–2024</div>
                  <p>
                    What started as a small team with a big vision has grown into a community of bag
                    enthusiasts, travelers, and everyday adventurers who trust Pack Pal to carry what matters
                    most. We've expanded our collection while maintaining our commitment to quality and
                    innovation.
                  </p>
                </div>
              </article>

              <article className="timeline-item">
                <div className="timeline-dot" aria-hidden="true"></div>
                <div className="timeline-content">
                  <div className="timeline-year">Today &amp; Beyond</div>
                  <p>
                    Today, Pack Pal continues to evolve, always listening to our customers and pushing the
                    boundaries of what a bag can be. We're not just making bags; we're crafting companions for
                    life's journey, one stitch at a time.
                  </p>
                </div>
              </article>
            </div>
          </section>

          {/* Values */}
          <section className="section reveal">
            <h2>Our Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon" aria-hidden="true">🎯</div>
                <h4>Quality First</h4>
                <p>
                  We never compromise on materials or craftsmanship. Every Pack Pal bag is built to last,
                  tested rigorously, and designed to exceed expectations.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon" aria-hidden="true">🌱</div>
                <h4>Sustainability</h4>
                <p>
                  We're committed to responsible manufacturing practices and sustainable materials, ensuring
                  our bags are good for you and the planet.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon" aria-hidden="true">💡</div>
                <h4>Innovation</h4>
                <p>
                  We constantly seek new ways to improve functionality, comfort, and style, incorporating the
                  latest technologies and design trends.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon" aria-hidden="true">🤝</div>
                <h4>Customer Focus</h4>
                <p>
                  Your needs drive our design decisions. We listen, learn, and create bags that truly serve
                  the people who use them every day.
                </p>
              </div>
            </div>
          </section>

          {/* Mission */}
          <section className="section reveal">
            <h2>Our Mission</h2>
            <p>
              Our mission is simple yet profound: to create bags that seamlessly blend into your life,
              enhancing your experiences without ever holding you back. We strive to be the brand you think
              of when you need something reliable, stylish, and perfectly suited to your needs.
            </p>

            <h3>What Sets Us Apart</h3>
            <p>
              While many companies make bags, few make companions. Pack Pal bags are thoughtfully designed
              with real-world use in mind. From the placement of every pocket to the choice of every
              material, we consider how our products will perform in the hands of real people living real
              lives.
            </p>

            <p>
              We believe in the power of good design to improve daily experiences, and we're committed to
              continuous innovation while maintaining the timeless appeal that makes our bags as relevant
              today as they will be years from now.
            </p>
          </section>

          {/* Team */}
          <section className="section reveal">
            <h2>Meet Our Team</h2>
            <p>
              Behind every Pack Pal bag is a dedicated team of designers, craftspeople, and customer advocates
              who share our passion for excellence.
            </p>

            <div className="team-grid">
              <article className="team-member">
                <div className="team-avatar" aria-hidden="true">S</div>
                <h4>Sandya Marasinghe</h4>
                <p><strong>Founder</strong></p>
                <p>
                  The visionary behind the bag business, the Founder establishes the company’s mission,
                  values, and long-term strategy. They drive innovation, oversee operations, and ensure the
                  brand stays aligned with customer needs and market trends.
                </p>
              </article>

              <article className="team-member">
                <div className="team-avatar" aria-hidden="true">R</div>
                <h4>Ramya Darshi</h4>
                <p><strong>Head Of Design</strong></p>
                <p>
                  The Head of Design leads the creative vision of the brand, overseeing the design and
                  development of new collections. They guide the design team, shape the brand’s identity, and
                  balance style with practicality.
                </p>
              </article>
            </div>
          </section>

          {/* CTA */}
          <section className="cta-section reveal" aria-label="Get in touch">
            <h3>Ready to Find Your Perfect Pack&nbsp;Pal?</h3>
            <p>Discover our collection of thoughtfully designed bags that are ready to accompany you on life's adventures.</p>
            <a className="cta-button" href="#contact">Shop Our Collection</a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Aboutpage;
