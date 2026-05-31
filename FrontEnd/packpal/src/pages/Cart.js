// src/pages/Cart.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Cart.css";
import Header from "../Components/Header/Header";

const STORAGE_KEY = "packPalCart";
const TX_URL = "http://localhost:5000/api/transactions";
const PRODUCTS_URL = "http://localhost:5000/api/products";

/* ───────── money / date ───────── */
const money = (n) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(
    Number(n || 0)
  );
const onlyDigits = (s = "") => (s || "").replace(/\D/g, "");
const nowISO = () => new Date().toISOString().slice(0, 10);

/* ───────── regex & validation ───────── */
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}$/;
const cityRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}$/;
const zipRe = /^[A-Za-z0-9 -]{3,10}$/;

const cleanName = (v = "") =>
  v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g, "").replace(/\s{2,}/g, " ").trim();
const cleanCity = (v = "") =>
  v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g, "").replace(/\s{2,}/g, " ").trim();
const trimMultiSpace = (s = "") => s.replace(/\s{2,}/g, " ").trim();

const allowDigits = /[0-9]/;
const allowNameChar = /[A-Za-zÀ-ÖØ-öø-ÿ' .-]/;
const allowCityChar = allowNameChar;
const allowZipChar = /[A-Za-z0-9 -]/;

// input guards
const blockIfNot =
  (re) =>
  (e) => {
    if (e.data && !re.test(e.data)) e.preventDefault();
  };
const onPasteSanitize =
  (fn) =>
  (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const cleaned = fn(text || "");
    const t = e.target;
    const start = t.selectionStart ?? t.value.length;
    const end = t.selectionEnd ?? t.value.length;
    const next = t.value.slice(0, start) + cleaned + t.value.slice(end);
    t.value = next;
    const ev = new Event("input", { bubbles: true });
    t.dispatchEvent(ev);
  };

/* ───────── card validation ───────── */
const luhnCheck = (num) => {
  const s = onlyDigits(num);
  if (s.length < 12) return false;
  let sum = 0,
    alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = +s[i];
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};
const parseExpiry = (mmYY) => {
  const m = mmYY.match(/^(\d{2})\/?(\d{2})$/);
  if (!m) return null;
  const month = +m[1];
  const year = 2000 + +m[2];
  if (month < 1 || month > 12) return null;
  return { month, year };
};
const expiryInFuture = (mmYY) => {
  const p = parseExpiry(mmYY);
  if (!p) return false;
  const exp = new Date(p.year, p.month, 0, 23, 59, 59, 999);
  return exp >= new Date();
};

/* ───────── SL phone formatting ───────── */
const normalizeSLPhonePretty = (raw) => {
  let digits = onlyDigits(raw);
  if (digits.startsWith("0")) digits = "94" + digits.slice(1);
  if (!digits.startsWith("94")) digits = "94" + digits;
  digits = digits.slice(0, 11); // 94 + 9 local digits
  const local = digits.slice(2);
  let out = "+94";
  if (local.length > 0) out += " " + local.slice(0, 2);
  if (local.length > 2) out += " " + local.slice(2, 5);
  if (local.length > 5) out += " " + local.slice(5, 9);
  return out.trim();
};
const phoneIsValidSL = (pretty) => {
  const digits = onlyDigits(pretty);
  return digits.length === 11 && digits.startsWith("94");
};

/* ───────── form validation ───────── */
const validateContactAndAddress = (form) => {
  const errors = {};
  if (!form.email || !emailRe.test(form.email.trim()))
    errors.email = "Enter a valid email.";
  if (!form.phone || !phoneIsValidSL(form.phone))
    errors.phone = "Use a valid Sri Lankan number like +94 71 234 5678.";
  if (!form.firstName || !nameRe.test(form.firstName.trim()))
    errors.firstName = "First name should be at least 2 letters.";
  if (!form.lastName || !nameRe.test(form.lastName.trim()))
    errors.lastName = "Last name should be at least 2 letters.";
  if (!form.address || form.address.trim().length < 5)
    errors.address = "Address should be at least 5 characters.";
  if (!form.city || !cityRe.test(form.city.trim()))
    errors.city = "Enter a valid city or town.";
  if (!form.zip || !zipRe.test(form.zip.trim()))
    errors.zip = "Postal code should be 3–10 characters.";
  return errors;
};
const validateCard = (form) => {
  const errors = {};
  const rawPan = onlyDigits(form.cardNumber);
  if (rawPan.length < 13 || rawPan.length > 19 || !luhnCheck(form.cardNumber))
    errors.cardNumber = "Enter a valid card number.";
  if (!form.expiryDate || !parseExpiry(form.expiryDate))
    errors.expiryDate = "Use MM/YY format.";
  else if (!expiryInFuture(form.expiryDate))
    errors.expiryDate = "Card is expired.";
  const cv = onlyDigits(form.cvv);
  if (!(cv.length === 3 || cv.length === 4))
    errors.cvv = "CVV should be 3–4 digits.";
  if (!form.cardName || form.cardName.trim().length < 3)
    errors.cardName = "Enter the name shown on the card.";
  return errors;
};

/* ───────── component ───────── */
export default function Cart() {
  const [step, setStep] = useState("cart"); // cart -> payment -> success
  const [cart, setCart] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // form state
  const [form, setForm] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zip: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const change = (k, v) => {
    let value = v;
    if (k === "firstName" || k === "lastName") value = cleanName(v);
    if (k === "city") value = cleanCity(v);
    if (k === "email") value = v.replace(/\s+/g, "").toLowerCase();
    if (k === "zip") value = onlyDigits(v).slice(0, 10);
    setForm((f) => ({ ...f, [k]: value }));
  };
  const markTouched = (k) => setTouched((t) => ({ ...t, [k]: true }));
  const invalid = (k) => touched[k] && errors[k];

  // formatters
  const onCardNumber = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 19);
    v = v.replace(/(\d{4})(?=\d)/g, "$1 ");
    change("cardNumber", v);
  };
  const onExp = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    change("expiryDate", v);
  };
  const onCVV = (e) => change("cvv", onlyDigits(e.target.value).slice(0, 4));
  const onPhone = (e) => change("phone", normalizeSLPhonePretty(e.target.value));

  // for the Expiry title helper
  const thisYear2 = String(new Date().getFullYear()).slice(2);
  const minLabel = `01/${thisYear2}`;
  const maxLabel = `12/${String((new Date().getFullYear() + 10) % 100).padStart(2, "0")}`;

  // keep validation model up-to-date
  useEffect(() => {
    setErrors({
      ...validateContactAndAddress(form),
      ...(showPanel ? validateCard(form) : {}),
    });
  }, [form, showPanel]);

  // initial cart load & layout tweak
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setCart(
        Array.isArray(stored)
          ? stored.map((it) => ({
              ...it,
              price: Number(it.price || 0),
              quantity: Math.max(1, parseInt(it.quantity || 1, 10) || 1),
            }))
          : []
      );
    } catch {}
    document.body.classList.add("sidebar-off");
    return () => document.body.classList.remove("sidebar-off");
  }, []);

  // accept optional navigation state to add item
  useEffect(() => {
    const justAdded = location.state && location.state.justAdded;
    if (justAdded) {
      setCart((prev) => {
        const next = [
          ...prev,
          {
            ...justAdded,
            price: Number(justAdded.price || 0),
            quantity: Math.max(1, justAdded.quantity || 1),
          },
        ];
        writeCartToStorage(next);
        return next;
      });
      navigate(".", { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // listen for external cart changes (other tabs/components)
  useEffect(() => {
    const refresh = () => setCart(readCartFromStorage());
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", refresh);
    };
  }, []);

  /* ───────── cart storage helpers ───────── */
  const readCartFromStorage = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map((it) => ({
        ...it,
        price: Number(it.price || 0),
        quantity: Math.max(1, parseInt(it.quantity || 1, 10) || 1),
      }));
    } catch {
      return [];
    }
  };
  const writeCartToStorage = (arr) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      window.dispatchEvent(new Event("cart:updated"));
    } catch {}
  };

  /* ───────── totals ───────── */
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.quantity || 1),
      0
    );
    const tax = subtotal * 0.08;
    const shipping = subtotal > 500 ? 0 : 19.99;
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
  }, [cart]);

  /* ───────── cart ops ───────── */
  const updateQty = (id, delta) =>
    setCart((list) => {
      const next = list.map((it) =>
        String(it.id) === String(id)
          ? { ...it, quantity: Math.max(1, (Number(it.quantity) || 1) + delta) }
          : it
      );
      writeCartToStorage(next);
      return next;
    });

  const removeItem = (id) =>
    setCart((list) => {
      const next = list.filter((it) => String(it.id) !== String(id));
      writeCartToStorage(next);
      return next;
    });

  const clearCart = () => {
    writeCartToStorage([]);
    setCart([]);
  };

  /* ───────── flow: contact/address -> show panel; then card -> pay ───────── */
  const onClickCheckout = () => {
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }
    const errs = validateContactAndAddress(form);
    setTouched((t) => ({
      ...t,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      address: true,
      city: true,
      zip: true,
    }));
    setErrors((e) => ({ ...e, ...errs }));
    if (Object.keys(errs).length) return;

    setErr("");
    setOk("");
    setShowPanel(true);
    setTimeout(
      () => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60
    );
  };

  const processPayment = async () => {
    const cardErrors = validateCard(form);
    setTouched((t) => ({
      ...t,
      cardNumber: true,
      expiryDate: true,
      cvv: true,
      cardName: true,
    }));
    setErrors((e) => ({ ...e, ...cardErrors }));
    if (Object.keys(cardErrors).length) return;
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    setProcessing(true);
    setErr("");
    setOk("");

    const customerName = `${form.firstName} ${form.lastName}`.trim();
    const method = "Card";
    const date = nowISO();

    try {
      await Promise.all(
        cart.map((it) =>
          axios
            .post(
              `${PRODUCTS_URL}/${encodeURIComponent(String(it.id))}/sold`,
              { qty: Number(it.quantity || 1) },
              { headers: { "Content-Type": "application/json" } }
            )
            .catch((err) => {
              console.warn("Reorder bump failed:", it.id, err?.response?.data || err.message);
            })
        )
      );

      await Promise.all(
        cart.map((it) => {
          const qty = Number(it.quantity || 1);
          const unitPrice = Number(it.price || 0);
          const payload = {
            date,
            customer: customerName || form.email,
            customerId: "",
            fmc: false,
            productId: String(it.id),
            productName: it.name,
            qty,
            unitPrice,
            discountPerUnit: 0,
            total: unitPrice * qty,
            method,
            status: "Paid",
            notes: `Checkout: ${form.email} / ${form.phone}`,
          };
          return axios.post(TX_URL, payload, {
            headers: { "Content-Type": "application/json" },
          });
        })
      );

      clearCart();
      setOk("Payment successful and transactions saved.");
      setStep("success");
    } catch (e) {
      setErr(
        "Payment failed: " +
          (e?.response?.data?.message || e?.response?.data?.error || e.message || "Unknown error")
      );
    } finally {
      setProcessing(false);
    }
  };

  /* ───────── UI ───────── */
  return (
    <>
      {/* ✅ Navbar OUTSIDE cart-root to avoid CSS collisions */}
      <Header />

      <div className="cart-root">
        <div className="cart-wrap">
          <div className="container">
            {/* Cart page header (unique class names) */}
            <div className="cart-page-header">
              <h1 className="cart-brand">
                <img src="/new logo.png" alt="PackPal logo" className="cart-logo-img" />
                <span>PackPal</span>
              </h1>
              <p>Smart Bag System - Intelligent Packing Solutions</p>
            </div>

            {/* CART */}
            {step === "cart" && (
              <section className="page active">
                <h2 className="page-title">🛒 Your PackPal Cart</h2>

                {err && (
                  <div className="error" style={{ color: "#b91c1c", marginBottom: 8 }}>
                    {err}
                  </div>
                )}
                {ok && (
                  <div className="ok" style={{ color: "#065f46", marginBottom: 8 }}>
                    {ok}
                  </div>
                )}

                {!cart.length ? (
                  <div className="empty">
                    <p>Your cart is empty.</p>
                    <div style={{ marginTop: 12 }}>
                      <button className="btn" onClick={() => navigate("/home")}>
                        🛍️ Browse Products
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div id="cartItems">
                      {cart.map((item) => {
                        const media = item.img ? (
                          <img
                            src={item.img}
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://via.placeholder.com/800x600?text=Bag";
                            }}
                          />
                        ) : (
                          item.icon || "🎒"
                        );
                        return (
                          <div className="cart-item" key={item.id}>
                            <div className="item-image">{media}</div>
                            <div className="item-details">
                              <div className="item-name">{item.name}</div>
                              <div className="item-description">{item.description || ""}</div>
                              <div className="item-price">{money(item.price)}</div>
                            </div>
                            <div className="quantity-controls">
                              <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>
                                −
                              </button>
                              <div className="qty-display">{item.quantity || 1}</div>
                              <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>
                                +
                              </button>
                            </div>
                            <button className="remove-btn" onClick={() => removeItem(item.id)}>
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="cart-summary">
                      <h3>📊 PackPal Order Summary</h3>
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>{money(totals.subtotal)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Tax (8%):</span>
                        <span>{money(totals.tax)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping:</span>
                        <span>{totals.shipping === 0 ? "FREE" : money(totals.shipping)}</span>
                      </div>
                      <div className="summary-row total-row">
                        <span>Total:</span>
                        <span>{money(totals.total)}</span>
                      </div>

                      <div style={{ textAlign: "center", marginTop: 20 }}>
                        <button className="btn btn-secondary" onClick={clearCart}>
                          🧹 Clear Cart
                        </button>
                        <button className="btn btn-success" onClick={() => setStep("payment")}>
                          🚀 Proceed
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* PAYMENT STEP */}
            {step === "payment" && (
              <section className="page active">
                <h2 className="page-title">👤 Customer Details</h2>

                <div className="payment-form">
                  {/* Contact */}
                  <div className="form-section">
                    <h3>📧 Contact Information</h3>

                    <div className={`form-group ${invalid("email") ? "has-error" : ""}`}>
                      <label htmlFor="email">Email Address</label>
                      <input
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={(e) => change("email", e.target.value)}
                        onBlur={() => markTouched("email")}
                        onBeforeInput={blockIfNot(/[\w.@+-]/)}
                        onPaste={onPasteSanitize((s) => s.replace(/\s+/g, "").slice(0, 254))}
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        required
                        aria-invalid={!!invalid("email")}
                      />
                      {invalid("email") && <div className="field-error">{errors.email}</div>}
                    </div>

                    <div className={`form-group ${invalid("phone") ? "has-error" : ""}`}>
                      <label htmlFor="phone">Phone Number (Sri Lanka)</label>
                      <input
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={onPhone}
                        onBlur={() => markTouched("phone")}
                        onBeforeInput={blockIfNot(allowDigits)}
                        onPaste={onPasteSanitize((s) => s.replace(/\D/g, "").slice(0, 11))}
                        placeholder="+94 71 234 5678"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        aria-invalid={!!invalid("phone")}
                      />
                      {invalid("phone") && <div className="field-error">{errors.phone}</div>}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="form-section">
                    <h3>🚚 Shipping Address</h3>
                    <div className="form-row">
                      <div className={`form-group ${invalid("firstName") ? "has-error" : ""}`}>
                        <label htmlFor="firstName">First Name</label>
                        <input
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={(e) => change("firstName", e.target.value)}
                          onBlur={() => markTouched("firstName")}
                          onBeforeInput={blockIfNot(allowNameChar)}
                          onPaste={onPasteSanitize(cleanName)}
                          placeholder="John"
                          required
                          inputMode="text"
                          pattern="[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}"
                          aria-invalid={!!invalid("firstName")}
                        />
                        {invalid("firstName") && (
                          <div className="field-error">{errors.firstName}</div>
                        )}
                      </div>
                      <div className={`form-group ${invalid("lastName") ? "has-error" : ""}`}>
                        <label htmlFor="lastName">Last Name</label>
                        <input
                          id="lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={(e) => change("lastName", e.target.value)}
                          onBlur={() => markTouched("lastName")}
                          onBeforeInput={blockIfNot(allowNameChar)}
                          onPaste={onPasteSanitize(cleanName)}
                          placeholder="Doe"
                          required
                          inputMode="text"
                          pattern="[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}"
                          aria-invalid={!!invalid("lastName")}
                        />
                        {invalid("lastName") && (
                          <div className="field-error">{errors.lastName}</div>
                        )}
                      </div>
                    </div>

                    <div className={`form-group ${invalid("address") ? "has-error" : ""}`}>
                      <label htmlFor="address">Street Address</label>
                      <input
                        id="address"
                        name="address"
                        value={form.address}
                        onChange={(e) => change("address", e.target.value)}
                        onBlur={() => markTouched("address")}
                        onBeforeInput={blockIfNot(/[^<>{}[\]^`~]/)}
                        onPaste={onPasteSanitize((s) =>
                          trimMultiSpace(s.replace(/[<>{}[\]^`~]/g, "")).slice(0, 120)
                        )}
                        placeholder="123 Main Street"
                        required
                        minLength={5}
                        aria-invalid={!!invalid("address")}
                      />
                      {invalid("address") && (
                        <div className="field-error">{errors.address}</div>
                      )}
                    </div>

                    <div className="form-row">
                      <div className={`form-group ${invalid("city") ? "has-error" : ""}`}>
                        <label htmlFor="city">City / Town</label>
                        <input
                          id="city"
                          name="city"
                          value={form.city}
                          onChange={(e) => change("city", e.target.value)}
                          onBlur={() => markTouched("city")}
                          onBeforeInput={blockIfNot(allowCityChar)}
                          onPaste={onPasteSanitize(cleanCity)}
                          placeholder="Colombo"
                          required
                          pattern="[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}"
                          aria-invalid={!!invalid("city")}
                        />
                        {invalid("city") && <div className="field-error">{errors.city}</div>}
                      </div>
                      <div className={`form-group ${invalid("zip") ? "has-error" : ""}`}>
                        <label htmlFor="zip">Postal Code</label>
                        <input
                          id="zip"
                          name="zip"
                          value={form.zip}
                          onChange={(e) => change("zip", e.target.value)}
                          onBlur={() => markTouched("zip")}
                          onBeforeInput={blockIfNot(allowZipChar)}
                          onPaste={onPasteSanitize((s) => onlyDigits(s).slice(0, 10))}
                          placeholder="10400"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          aria-invalid={!!invalid("zip")}
                        />
                        {invalid("zip") && <div className="field-error">{errors.zip}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setStep("cart")}>
                      ⬅️ Back to Cart
                    </button>
                    <button className="btn btn-success" onClick={onClickCheckout}>
                      ✅ Checkout
                    </button>
                  </div>

                  {/* Payment panel */}
                  {showPanel && (
                    <div className="panel-blue" ref={panelRef}>
                      <h3 className="panel-title">💳 Payment Information & Summary</h3>

                      <div>
                        <div className={`form-group ${invalid("cardNumber") ? "has-error" : ""}`}>
                          <label htmlFor="cardNumber">Card Number</label>
                          <input
                            id="cardNumber"
                            name="cardNumber"
                            value={form.cardNumber}
                            onChange={onCardNumber}
                            onBlur={() => markTouched("cardNumber")}
                            onBeforeInput={blockIfNot(allowDigits)}
                            onPaste={onPasteSanitize((s) =>
                              s.replace(/\D/g, "").slice(0, 19)
                            )}
                            placeholder="1234 5678 9012 3456"
                            maxLength={23}
                            required
                            inputMode="numeric"
                            aria-invalid={!!invalid("cardNumber")}
                          />
                          {invalid("cardNumber") && (
                            <div className="field-error">{errors.cardNumber}</div>
                          )}
                        </div>

                        <div className="form-row">
                          <div
                            className={`form-group ${invalid("expiryDate") ? "has-error" : ""}`}
                          >
                            <label htmlFor="expiryDate">Expiry Date</label>
                            <input
                              id="expiryDate"
                              name="expiryDate"
                              value={form.expiryDate}
                              onChange={onExp}
                              onBlur={() => markTouched("expiryDate")}
                              onBeforeInput={blockIfNot(allowDigits)}
                              onPaste={onPasteSanitize((s) =>
                                s.replace(/\D/g, "").slice(0, 4)
                              )}
                              placeholder="MM/YY"
                              maxLength={5}
                              required
                              inputMode="numeric"
                              pattern="^(0[1-9]|1[0-2])\/\d{2}$"
                              title={`Enter MM/YY (from ${minLabel} to ${maxLabel})`}
                              aria-invalid={!!invalid("expiryDate")}
                            />
                            {invalid("expiryDate") && (
                              <div className="field-error">{errors.expiryDate}</div>
                            )}
                          </div>

                          <div className={`form-group ${invalid("cvv") ? "has-error" : ""}`}>
                            <label htmlFor="cvv">CVV</label>
                            <input
                              id="cvv"
                              name="cvv"
                              value={form.cvv}
                              onChange={onCVV}
                              onBlur={() => markTouched("cvv")}
                              onBeforeInput={blockIfNot(allowDigits)}
                              onPaste={onPasteSanitize((s) =>
                                s.replace(/\D/g, "").slice(0, 4)
                              )}
                              placeholder="123"
                              maxLength={4}
                              required
                              inputMode="numeric"
                              aria-invalid={!!invalid("cvv")}
                            />
                            {invalid("cvv") && <div className="field-error">{errors.cvv}</div>}
                          </div>

                          <div className={`form-group ${invalid("cardName") ? "has-error" : ""}`}>
                            <label htmlFor="cardName">Name on Card</label>
                            <input
                              id="cardName"
                              name="cardName"
                              value={form.cardName}
                              onChange={(e) => change("cardName", e.target.value)}
                              onBlur={() => markTouched("cardName")}
                              onBeforeInput={blockIfNot(allowNameChar)}
                              onPaste={onPasteSanitize(cleanName)}
                              placeholder="John Doe"
                              required
                              aria-invalid={!!invalid("cardName")}
                            />
                            {invalid("cardName") && (
                              <div className="field-error">{errors.cardName}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="summary-block">
                        {cart.map((it) => (
                          <div key={it.id} className="summary-row">
                            <span>
                              {(it.img ? "🖼️" : it.icon || "🎒")}&nbsp;{it.name} (x
                              {it.quantity || 1})
                            </span>
                            <span>{money((Number(it.price) || 0) * (Number(it.quantity) || 1))}</span>
                          </div>
                        ))}
                        <div className="summary-row">
                          <span>Subtotal:</span>
                          <span>{money(totals.subtotal)}</span>
                        </div>
                        <div className="summary-row">
                          <span>Tax (8%):</span>
                          <span>{money(totals.tax)}</span>
                        </div>
                        <div className="summary-row">
                          <span>Shipping:</span>
                          <span>{totals.shipping === 0 ? "FREE" : money(totals.shipping)}</span>
                        </div>
                        <div className="summary-row total-row">
                          <span>Total Amount:</span>
                          <span>{money(totals.total)}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", marginTop: 16 }}>
                        <button
                          className="btn btn-success"
                          onClick={processPayment}
                          disabled={processing || !cart.length}
                        >
                          {processing ? "⏳ Processing..." : "🔒 Complete Payment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === "success" && (
              <section className="page active">
                <div className="success-message">
                  <div className="success-icon">✅</div>
                  <h2>🎉 Payment Successful!</h2>
                  <p style={{ fontSize: "1.3rem", color: "#4a5568", margin: "25px 0" }}>
                    Thank you for choosing PackPal! Your smart bag order has been recorded.
                  </p>
                  <div style={{ textAlign: "center", marginTop: 20 }}>
                    <button className="btn" onClick={() => navigate("/finance")}>
                      📄 View Finance
                    </button>
                    <button className="btn" onClick={() => navigate("/home")}>
                      🛍️ Continue Shopping
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
