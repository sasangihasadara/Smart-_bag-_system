import React, { useEffect } from 'react';
import './SizeGuide.css';
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

function SizeGuide() {
  // Tab switching functionality
  const showTab = (e, tabName) => {
    const contents = document.querySelectorAll('.size-content');
    contents.forEach((content) => content.classList.remove('active'));

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab) => tab.classList.remove('active'));

    const section = document.getElementById(tabName);
    if (section) section.classList.add('active');

    if (e && e.currentTarget) {
      e.currentTarget.classList.add('active');
    }
  };

  // Size recommendation calculator
  const calculateRecommendation = () => {
    const purpose = document.getElementById('purpose').value;
    const laptop = document.getElementById('laptop').value;
    const duration = document.getElementById('duration').value;
    const resultDiv = document.getElementById('recommendation');

    if (!purpose) {
      resultDiv.innerHTML =
        '⚠️ Please select a primary use to get your recommendation!';
      resultDiv.style.display = 'block';
      resultDiv.style.background =
        'linear-gradient(135deg, #ff6b6b, #ffa500)';
      return;
    }

    let bagType = '';
    let size = '';
    let reasoning = '';

    if (purpose === 'daily') {
      bagType = 'Handbag or Small Backpack';
      size = 'Small to Medium';
      reasoning = 'Perfect for everyday essentials without being bulky';
    } else if (purpose === 'work') {
      if (laptop) {
        bagType = `${laptop}" Laptop Bag or Medium Backpack`;
        size = 'Medium';
        reasoning = 'Professional look with laptop protection';
      } else {
        bagType = 'Medium Handbag or Business Backpack';
        size = 'Medium';
        reasoning = 'Professional appearance with good capacity';
      }
    } else if (purpose === 'school') {
      bagType = 'Medium to Large Backpack';
      size = laptop ? 'Large' : 'Medium';
      reasoning = 'Space for books, supplies, and laptop if needed';
    } else if (purpose === 'travel') {
      if (duration === 'day') {
        bagType = 'Small Backpack or Large Handbag';
        size = 'Small to Medium';
      } else if (duration === 'weekend') {
        bagType = 'Cabin Size Travel Bag';
        size = 'Medium (44L)';
      } else if (duration === 'week') {
        bagType = 'Medium Travel Bag';
        size = 'Large (73L)';
      } else {
        bagType = 'Large Travel Bag';
        size = 'Extra Large (112L+)';
      }
      reasoning = 'Sized appropriately for your trip duration';
    } else if (purpose === 'gym') {
      bagType = 'Medium Backpack or Gym Bag';
      size = 'Medium';
      reasoning = 'Space for clothes, shoes, and accessories';
    } else if (purpose === 'hiking') {
      if (duration === 'day') {
        bagType = 'Medium Backpack';
        size = 'Medium (25-35L)';
      } else {
        bagType = 'Large Hiking Backpack';
        size = 'Large (50L+)';
      }
      reasoning = 'Designed for outdoor gear and comfort';
    }

    const recommendation = `
      <div style="margin-bottom: 15px;">
        <strong>🎉 Perfect Match Found!</strong>
      </div>
      <div style="font-size: 1.1rem; margin-bottom: 10px;">
        <strong>Recommended:</strong> ${bagType}
      </div>
      <div style="font-size: 1.1rem; margin-bottom: 10px;">
        <strong>Size:</strong> ${size}
      </div>
      <div style="font-size: 1rem; opacity: 0.9;">
        ${reasoning}
      </div>
    `;

    resultDiv.innerHTML = recommendation;
    resultDiv.style.display = 'block';
    resultDiv.style.background =
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  };

  // Effects for animations & floating keyframes
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    });

    const cards = document.querySelectorAll('.size-card');
    cards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'all 0.6s ease-out';
      observer.observe(card);
    });

    document.querySelectorAll('.bag-shape').forEach((shape, index) => {
      shape.style.animation = `float 3s ease-in-out infinite ${index * 0.5}s`;
    });

    const existing = document.getElementById('float-anim-style');
    if (!existing) {
      const style = document.createElement('style');
      style.id = 'float-anim-style';
      style.textContent = `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="sizeguide-root">
      <Header/>
      {/* ===== Handbags Banner (hero) – search removed, taller hero kept ===== */}
      <section className="hb-hero">
        <div className="hb-dots" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = `${Math.random() * 100}%`;
            const delay = `${-Math.random() * 12}s`;
            const dur = `${10 + Math.random() * 10}s`;
            const drift = `${(Math.random() * 160 - 80).toFixed(0)}px`;
            const scale = (0.7 + Math.random() * 0.8).toFixed(2);
            const sizeCls = Math.random() < 0.18 ? "lg" : Math.random() < 0.5 ? "sm" : "";
            return (
              <span
                key={i}
                className={`hb-dot ${sizeCls}`}
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

        <div className="hb-hero-inner">
          <h1>Size Guide</h1>
          <p>Find your perfect bag with our comprehensive sizing system. Choose the right size for every adventure.</p>
        </div>
      </section>
      {/* =================== end hero =================== */}

      <div className="sg-wrap">
        <div className="sg-card">
          <div className="container">
            {/* Size Guide Section */}
            <div className="size-guide-section">
              <h2 className="section-title">Bag Categories</h2>

              {/* Tabs */}
              <div className="size-tabs">
                <button
                  className="tab-btn active"
                  onClick={(e) => showTab(e, 'backpacks')}
                >
                  Backpacks
                </button>
                <button
                  className="tab-btn"
                  onClick={(e) => showTab(e, 'handbags')}
                >
                  Handbags
                </button>
                <button
                  className="tab-btn"
                  onClick={(e) => showTab(e, 'travel')}
                >
                  Travel Bags
                </button>
                <button
                  className="tab-btn"
                  onClick={(e) => showTab(e, 'laptop')}
                >
                  Laptop Bags
                </button>
              </div>

              {/* Backpacks */}
              <div id="backpacks" className="size-content active">
                <div className="size-grid">
                  <div className="size-card">
                    <div
                      className="bag-visual"
                      style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}
                    >
                      <div className="bag-shape" style={{ width: '40%', height: '60%' }}>SMALL</div>
                    </div>
                    <div className="size-info">
                      <h3>Small Backpack</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">35-40cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">25-30cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">15-18cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">15-25L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Daily essentials, gym, short trips</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div
                      className="bag-visual"
                      style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}
                    >
                      <div className="bag-shape" style={{ width: '55%', height: '70%' }}>MEDIUM</div>
                    </div>
                    <div className="size-info">
                      <h3>Medium Backpack</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">40-45cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">30-35cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">18-22cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">25-35L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: School, work, day hikes, weekend trips</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div
                      className="bag-visual"
                      style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}
                    >
                      <div className="bag-shape" style={{ width: '70%', height: '80%' }}>LARGE</div>
                    </div>
                    <div className="size-info">
                      <h3>Large Backpack</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">45-55cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">35-40cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">22-28cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">35-50L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Multi-day trips, camping, travel</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handbags */}
              <div id="handbags" className="size-content">
                <div className="size-grid">
                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                      <div className="bag-shape" style={{ width: '50%', height: '40%', borderRadius: '50px' }}>MINI</div>
                    </div>
                    <div className="size-info">
                      <h3>Mini Handbag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">15-20cm</span></div>
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">10-15cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">5-8cm</span></div>
                        <div className="detail-item"><span className="detail-label">Style:</span><span className="detail-value">Evening</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Phone, cards, lipstick, keys</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #ffa8a8 0%, #fcff9e 100%)' }}>
                      <div className="bag-shape" style={{ width: '65%', height: '50%', borderRadius: '30px' }}>REGULAR</div>
                    </div>
                    <div className="size-info">
                      <h3>Regular Handbag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">25-35cm</span></div>
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">20-28cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">10-15cm</span></div>
                        <div className="detail-item"><span className="detail-label">Style:</span><span className="detail-value">Daily</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Wallet, phone, makeup, sunglasses</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)' }}>
                      <div className="bag-shape" style={{ width: '80%', height: '60%', borderRadius: 20 }}>LARGE</div>
                    </div>
                    <div className="size-info">
                      <h3>Large Handbag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">35-45cm</span></div>
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">28-35cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">15-20cm</span></div>
                        <div className="detail-item"><span className="detail-label">Style:</span><span className="detail-value">Tote</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Work items, tablet, documents, shopping</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Travel */}
              <div id="travel" className="size-content">
                <div className="size-grid">
                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
                      <div className="bag-shape" style={{ width: '60%', height: '40%' }}>CABIN</div>
                    </div>
                    <div className="size-info">
                      <h3>Cabin Size</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">55cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">40cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">20cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">44L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: 2-3 days, carry-on flights</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)' }}>
                      <div className="bag-shape" style={{ width: '75%', height: '55%' }}>MEDIUM</div>
                    </div>
                    <div className="size-info">
                      <h3>Medium Travel</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">65cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">45cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">25cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">73L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: 4-7 days, checked luggage</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                      <div className="bag-shape" style={{ width: '85%', height: '70%' }}>LARGE</div>
                    </div>
                    <div className="size-info">
                      <h3>Large Travel</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Height:</span><span className="detail-value">75cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">50cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">30cm</span></div>
                        <div className="detail-item"><span className="detail-label">Volume:</span><span className="detail-value">112L</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: 7+ days, extended travel</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Laptop */}
              <div id="laptop" className="size-content">
                <div className="size-grid">
                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <div className="bag-shape" style={{ width: '50%', height: '35%', borderRadius: 5 }}>13"</div>
                    </div>
                    <div className="size-info">
                      <h3>13" Laptop Bag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">35cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">25cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">3-5cm</span></div>
                        <div className="detail-item"><span className="detail-label">Screen:</span><span className="detail-value">Up to 13"</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: MacBook Air, ultrabooks, tablets</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                      <div className="bag-shape" style={{ width: '60%', height: '42%', borderRadius: 5 }}>15"</div>
                    </div>
                    <div className="size-info">
                      <h3>15" Laptop Bag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">40cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">28cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">4-6cm</span></div>
                        <div className="detail-item"><span className="detail-label">Screen:</span><span className="detail-value">Up to 15"</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Most laptops, business meetings</div>
                    </div>
                  </div>

                  <div className="size-card">
                    <div className="bag-visual" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                      <div className="bag-shape" style={{ width: '70%', height: '50%', borderRadius: 5 }}>17"</div>
                    </div>
                    <div className="size-info">
                      <h3>17" Laptop Bag</h3>
                      <div className="size-details">
                        <div className="detail-item"><span className="detail-label">Length:</span><span className="detail-value">45cm</span></div>
                        <div className="detail-item"><span className="detail-label">Width:</span><span className="detail-value">32cm</span></div>
                        <div className="detail-item"><span className="detail-label">Depth:</span><span className="detail-value">5-8cm</span></div>
                        <div className="detail-item"><span className="detail-label">Screen:</span><span className="detail-value">Up to 17"</span></div>
                      </div>
                      <div className="capacity-info">Perfect for: Gaming laptops, workstations</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculator */}
              <div className="measurement-tool">
                <h3>🎯 Find Your Perfect Size</h3>
                <p style={{ textAlign:'center', color:'#666', marginBottom:30 }}>
                  Tell us what you need to carry, and we'll recommend the perfect bag size!
                </p>

                <div className="measurement-inputs">
                  <div className="input-group">
                    <label htmlFor="purpose">Primary Use:</label>
                    <select id="purpose" style={{ width:'100%', padding:15, border:'2px solid #e0e0e0', borderRadius:10, fontSize:'1rem' }}>
                      <option value="">Select purpose</option>
                      <option value="daily">Daily carry</option>
                      <option value="work">Work/Business</option>
                      <option value="school">School/College</option>
                      <option value="travel">Travel</option>
                      <option value="gym">Gym/Sports</option>
                      <option value="hiking">Hiking/Outdoor</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="laptop">Laptop Size:</label>
                    <select id="laptop" style={{ width:'100%', padding:15, border:'2px solid #e0e0e0', borderRadius:10, fontSize:'1rem' }}>
                      <option value="">No laptop</option>
                      <option value="13">13 inch</option>
                      <option value="15">15 inch</option>
                      <option value="17">17 inch</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="duration">Trip Duration:</label>
                    <select id="duration" style={{ width:'100%', padding:15, border:'2px solid #e0e0e0', borderRadius:10, fontSize:'1rem' }}>
                      <option value="">Not applicable</option>
                      <option value="day">Day trip</option>
                      <option value="weekend">Weekend (2-3 days)</option>
                      <option value="week">Week (4-7 days)</option>
                      <option value="extended">Extended (7+ days)</option>
                    </select>
                  </div>
                </div>

                <button className="calculate-btn" onClick={calculateRecommendation}>
                  Get My Recommendation
                </button>
                <div id="recommendation" className="result-display"></div>
              </div>

              {/* Comparison Table */}
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Bag Type</th>
                    <th>Small</th>
                    <th>Medium</th>
                    <th>Large</th>
                    <th>Extra Large</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Backpacks</strong></td>
                    <td>15-25L<br/>35-40cm H</td>
                    <td>25-35L<br/>40-45cm H</td>
                    <td>35-50L<br/>45-55cm H</td>
                    <td>50-70L<br/>55-65cm H</td>
                  </tr>
                  <tr>
                    <td><strong>Travel Bags</strong></td>
                    <td>Cabin Size<br/>44L</td>
                    <td>Check-in<br/>73L</td>
                    <td>Large Check<br/>112L</td>
                    <td>Extended<br/>140L+</td>
                  </tr>
                  <tr>
                    <td><strong>Handbags</strong></td>
                    <td>Mini<br/>15-20cm L</td>
                    <td>Regular<br/>25-35cm L</td>
                    <td>Large<br/>35-45cm L</td>
                    <td>Oversized<br/>45cm+ L</td>
                  </tr>
                </tbody>
              </table>

              {/* Visual Guide */}
              <div className="visual-guide">
                <h3 style={{ textAlign:'center', marginBottom:30, fontSize:'1.8rem', color:'#333' }}>
                  How to Measure Your Bag
                </h3>
                <svg className="measurement-diagram" viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
                  <rect x="150" y="100" width="200" height="250" fill="none" stroke="#667eea" strokeWidth="3" rx="10"/>
                  <line x1="120" y1="100" x2="120" y2="350" stroke="#ff6b6b" strokeWidth="2"/>
                  <line x1="115" y1="100" x2="125" y2="100" stroke="#ff6b6b" strokeWidth="2"/>
                  <line x1="115" y1="350" x2="125" y2="350" stroke="#ff6b6b" strokeWidth="2"/>
                  <text x="90" y="230" fill="#ff6b6b" fontWeight="bold" textAnchor="middle" transform="rotate(-90 90 230)">HEIGHT</text>
                  <line x1="150" y1="80" x2="350" y2="80" stroke="#4facfe" strokeWidth="2"/>
                  <line x1="150" y1="75" x2="150" y2="85" stroke="#4facfe" strokeWidth="2"/>
                  <line x1="350" y1="75" x2="350" y2="85" stroke="#4facfe" strokeWidth="2"/>
                  <text x="250" y="70" fill="#4facfe" fontWeight="bold" textAnchor="middle">WIDTH</text>
                  <rect x="155" y="105" width="190" height="240" fill="rgba(102, 126, 234, 0.1)" rx="8"/>
                  <text x="250" y="380" fill="#667eea" fontWeight="bold" textAnchor="middle">DEPTH (Side View)</text>
                  <circle cx="250" cy="225" r="40" fill="rgba(255, 255, 255, 0.9)" stroke="#667eea" strokeWidth="2"/>
                  <text x="250" y="230" fill="#667eea" fontWeight="bold" textAnchor="middle" fontSize="14">BAG</text>
                </svg>
              </div>

              {/* Tips */}
              <div className="tips-section">
                <div className="tip-card">
                  <div className="tip-icon">📏</div>
                  <h4>Measure Correctly</h4>
                  <p>Always measure at the widest, tallest, and deepest points of your bag. Include any external pockets or protrusions in your measurements.</p>
                </div>
                <div className="tip-card">
                  <div className="tip-icon">✈️</div>
                  <h4>Airline Guidelines</h4>
                  <p>Check airline restrictions before traveling. Cabin bags typically must not exceed 55x40x20cm, but rules vary by airline.</p>
                </div>
                <div className="tip-card">
                  <div className="tip-icon">🎒</div>
                  <h4>Packing Tips</h4>
                  <p>A bag that's 80% full is optimal for comfort and organization. Leave room for souvenirs and unexpected items!</p>
                </div>
                <div className="tip-card">
                  <div className="tip-icon">💡</div>
                  <h4>Size vs Purpose</h4>
                  <p>Consider your intended use. A larger bag isn't always better - choose based on your specific needs and comfort level.</p>
                </div>
              </div>
            </div>

          </div>{/* .container */}
        </div>{/* .sg-card */}
      </div>{/* .sg-wrap */}
      <Footer/>
    </div>
  );
}

export default SizeGuide;
