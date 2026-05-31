// src/Components/Createaccount/Createaccount.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Createaccount.css";

export default function Createaccount() {
  // form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tos, setTos] = useState(false);

  // UI state
  const [showPwd, setShowPwd]       = useState(false);
  const [status, setStatus]         = useState({ type: "", msg: "" }); // "good" | "bad" | ""
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // touched state
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirm: false,
    tos: false,
  });

  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const REGISTER_URL = `${API_BASE}/api/auth/register`;

  // --- Validators ---
  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const strongPwd =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>_\-\\/~`]/.test(password);

  const errors = {
    firstName: firstName.trim().length >= 2 ? "" : "Please enter your first name.",
    lastName:  lastName.trim().length >= 2 ? "" : "Please enter your last name.",
    email:     validEmail ? "" : "Enter a valid email address.",
    password:  strongPwd ? "" : "Use 8+ chars incl. upper, lower, number & symbol.",
    confirm:   confirm === password ? "" : "Passwords do not match.",
    tos:       tos ? "" : "You must accept the Terms.",
  };

  const formValid = Object.values(errors).every((e) => e === "");
  const shouldShow = (field) => (touched[field] || submitted) && errors[field];

  // --- Submit ---
  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (!formValid || submitting) {
      setStatus({ type: "bad", msg: "Please fix the highlighted fields." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", msg: "" });

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName : lastName.trim(),
        email    : email.trim().toLowerCase(),
        password,
      };

      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // harmless if you don't use cookies
        body: JSON.stringify(payload),
      });

      // Try to parse JSON (in case backend returns helpful message)
      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        // Friendly messages
        const msg =
          data?.message ||
          (res.status === 409
            ? "Email already registered."
            : `Registration failed (${res.status}).`);
        throw new Error(msg);
      }

      setStatus({ type: "good", msg: "Account created! Redirecting to login…" });
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      const msg =
        err?.message === "Failed to fetch"
          ? "Could not reach the server. Check backend URL and CORS."
          : err?.message || "Could not create account.";
      setStatus({ type: "bad", msg });
    } finally {
      setSubmitting(false);
    }
  };

  const title = useMemo(() => "Create\nAccount", []);

  return (
    <div className="acc page-wrap account-page">
      <div className="auth-page">
        <div className="auth-card">
          {/* Left brand panel */}
          <aside className="auth-left">
            <div className="brand-col">
              <div className="brand-center">
                <img
                  src={`${process.env.PUBLIC_URL || ""}/new logo.png`}
                  alt="PackPal logo"
                  className="brand-logo"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <h1 className="brand-name">PackPal</h1>
                <p className="brand-copy">
                  Where fabric meets purpose, and style meets endurance.
                </p>
              </div>
            </div>
          </aside>

          {/* Right form */}
          <main className="auth-right">
            <div className="form-wrap">
              <h2 className="title" aria-label="Create Account">
                {title.split("\n").map((t, i) => (
                  <span key={i} className="line">
                    {t}
                  </span>
                ))}
              </h2>
              <p className="subtitle">Sign up to your PackPal account</p>

              {/* Error banner (clearly visible) */}
              {status.msg && (
                <div
                  style={{
                    backgroundColor:
                      status.type === "bad" ? "#fdecea" : "#e9f8ee",
                    color: status.type === "bad" ? "#b71c1c" : "#0b7a2a",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    textAlign: "center",
                    marginBottom: "12px",
                    fontWeight: "600",
                  }}
                >
                  {status.msg}
                </div>
              )}

              <form onSubmit={submit} className="form" noValidate>
                <div className="grid-2">
                  <label className="field">
                    <span className="label">First Name</span>
                    <input
                      value={firstName}
                      onChange={(e)=>setFirstName(e.target.value)}
                      onBlur={()=>setTouched(t=>({...t, firstName:true}))}
                      placeholder="Enter first name"
                      autoComplete="given-name"
                      className={shouldShow("firstName") ? "invalid" : ""}
                    />
                    {shouldShow("firstName") && <small className="error">{errors.firstName}</small>}
                  </label>

                  <label className="field">
                    <span className="label">Last Name</span>
                    <input
                      value={lastName}
                      onChange={(e)=>setLastName(e.target.value)}
                      onBlur={()=>setTouched(t=>({...t, lastName:true}))}
                      placeholder="Enter last name"
                      autoComplete="family-name"
                      className={shouldShow("lastName") ? "invalid" : ""}
                    />
                    {shouldShow("lastName") && <small className="error">{errors.lastName}</small>}
                  </label>
                </div>

                <label className="field">
                  <span className="label">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    onBlur={()=>setTouched(t=>({...t, email:true}))}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className={shouldShow("email") ? "invalid" : ""}
                  />
                  {shouldShow("email") && <small className="error">{errors.email}</small>}
                </label>

                <label className="field">
                  <span className="label">Password</span>
                  <div className="input-shell">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      onBlur={()=>setTouched(t=>({...t, password:true}))}
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      className={shouldShow("password") ? "invalid" : ""}
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      title={showPwd ? "Hide" : "Show"}
                      onClick={()=>setShowPwd(s=>!s)}
                    >
                      {showPwd ? "🙈" : "👁"}
                    </button>
                  </div>
                  <small className="hint">8+ chars, include upper, lower, number & symbol.</small>
                  {shouldShow("password") && <small className="error">{errors.password}</small>}
                </label>

                <label className="field">
                  <span className="label">Confirm Password</span>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={(e)=>setConfirm(e.target.value)}
                    onBlur={()=>setTouched(t=>({...t, confirm:true}))}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={shouldShow("confirm") ? "invalid" : ""}
                  />
                  {shouldShow("confirm") && <small className="error">{errors.confirm}</small>}
                </label>

                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={tos}
                    onChange={(e)=>setTos(e.target.checked)}
                    onBlur={()=>setTouched(t=>({...t, tos:true}))}
                  />
                  <span>I agree to the Terms & Privacy Policy</span>
                </label>
                {shouldShow("tos") && <small className="error">{errors.tos}</small>}

                {status.msg && (
                  <div
                    className={`status ${status.type}`}
                    role={status.type === "bad" ? "alert" : "status"}
                    aria-live="polite"
                    style={{ marginTop: 8 }}
                  >
                    {status.msg}
                  </div>
                )}

                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button
                    type="submit"
                    className={`primary-btn ${submitting ? "loading" : ""}`}
                    disabled={submitting}
                  >
                    {submitting ? "Creating..." : "Create Account"}
                  </button>
                </div>

                <div className="alt-auth">
                  Already have an account? <Link to="/login">Sign in</Link>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
