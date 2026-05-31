// src/Components/Header/Header.js
import React, { useEffect, useMemo, useState } from "react";
import {
  FaHome, FaLayerGroup, FaPuzzlePiece, FaTags, FaGift,
  FaChevronDown, FaUser, FaUserPlus, FaShoppingCart,
} from "react-icons/fa";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";

const STORAGE_KEY = "packPalCart";

/** Read auth from localStorage and decide if logged-in customer */
function readAuth() {
  try {
    const token = localStorage.getItem("pp:token");
    const raw = localStorage.getItem("pp:user");
    const user = raw ? JSON.parse(raw) : null;

    // Fallback if someone still writes pp:role (legacy)
    const legacyRole = localStorage.getItem("pp:role");
    const role = String(user?.role || legacyRole || "").trim().toLowerCase();

    return { token, user, role, isCustomer: !!token && role === "customer" };
  } catch {
    return { token: null, user: null, role: "", isCustomer: false };
  }
}

/** Only render a header on storefront pages (never on dashboards) */
const STOREFRONT_ALLOW_LIST = [
  "/home",
  "/handbag",
  "/accessories",
  "/clutches",
  "/kidsbag",
  "/totebag",
  "/sizeguide",
  "/sale",
  "/faq",
  "/aboutpage",
  "/feedback",
  "/customer",
];

export default function Header({
  cartCount: cartCountProp,
  onCartClick = () => {},
  onDropdown = () => {},
}) {
  const navigate = useNavigate();
  const loc = useLocation();

  const [{ isCustomer }, setAuth] = useState(readAuth());
  const [cartCount, setCartCount] = useState(0);

  // Determine if header should show on this route at all (storefront only)
  const showOnThisPage = useMemo(() => {
    const path = loc.pathname.toLowerCase();

    // Hide on auth pages
    if (path === "/login" || path === "/createaccount") return false;

    // Whitelist storefront paths only
    return STOREFRONT_ALLOW_LIST.some((p) =>
      path.startsWith(p.toLowerCase())
    );
  }, [loc.pathname]);

  // Keep cart count in sync
  useEffect(() => {
    const readCount = () => {
      try {
        const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(arr) ? arr.length : 0;
      } catch {
        return 0;
      }
    };

    setCartCount(
      typeof cartCountProp === "number" ? cartCountProp : readCount()
    );

    const refresh = () => setCartCount(readCount());

    const storageListener = (e) => {
      if (e.key === STORAGE_KEY) refresh();
    };

    window.addEventListener("storage", storageListener);
    window.addEventListener("cart:updated", refresh);

    return () => {
      window.removeEventListener("storage", storageListener);
      window.removeEventListener("cart:updated", refresh);
    };
  }, [cartCountProp]);

  // React to login/logout events and route changes
  useEffect(() => {
    const updateAuth = () => setAuth(readAuth());
    window.addEventListener("pp:auth:changed", updateAuth);
    window.addEventListener("storage", updateAuth);
    updateAuth(); // also run on mount/route change
    return () => {
      window.removeEventListener("pp:auth:changed", updateAuth);
      window.removeEventListener("storage", updateAuth);
    };
  }, [loc.pathname]);

  // If not a storefront route, don't render any header at all
  if (!showOnThisPage) return null;

  // If user is a logged-in customer, **hide this normal header** so LogoutHeader can render alone
  if (isCustomer) return null;

  return (
    <div className="ppx-header">
      <header className="header" id="header">
        <div className="header-content">
          <div className="header-top">
            {/* Brand */}
            <Link to="/home" className="logo" aria-label="PackPal Home">
              <img src="/new logo.png" alt="PackPal" className="logo-img" />
              <div className="logo-text">PackPal</div>
            </Link>

            {/* Nav */}
            <nav className="nav" aria-label="Primary">
              <ul className="nav-list">
                <li className="nav-item">
                  <NavLink to="/home" className="nav-link">
                    <FaHome /> Home
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="" className="nav-link">
                    <FaLayerGroup /> Collection{" "}
                    <FaChevronDown style={{ fontSize: "0.9rem", marginLeft: 6 }} />
                  </NavLink>

                  <div className="dropdown" role="menu" aria-label="Collections">
                    <NavLink
                      to="/kidsbag"
                      className="dropdown-item"
                      onClick={() => onDropdown("Kids Bag")}
                    >
                      <div className="dropdown-title">Kids Bag</div>
                      <div className="dropdown-desc">
                        Fun and colorful bags for children
                      </div>
                    </NavLink>
                    <NavLink
                      to="/totebag"
                      className="dropdown-item"
                      onClick={() => onDropdown("Tote Bag")}
                    >
                      <div className="dropdown-title">Tote Bag</div>
                      <div className="dropdown-desc">
                        Spacious and versatile everyday bags
                      </div>
                    </NavLink>
                    <NavLink
                      to="/handbag"
                      className="dropdown-item"
                      onClick={() => onDropdown("Handbag")}
                    >
                      <div className="dropdown-title">Handbag</div>
                      <div className="dropdown-desc">
                        Elegant bags for special occasions
                      </div>
                    </NavLink>
                    <NavLink
                      to="/clutches"
                      className="dropdown-item"
                      onClick={() => onDropdown("Clutch")}
                    >
                      <div className="dropdown-title">Clutch</div>
                      <div className="dropdown-desc">
                        Compact and stylish evening bags
                      </div>
                    </NavLink>
                  </div>
                </li>

                <li className="nav-item">
                  <NavLink to="/accessories" className="nav-link">
                    <FaPuzzlePiece /> Accessories
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/sale" className="nav-link">
                    <FaTags /> Sales
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/aboutpage" className="nav-link">
                    <FaGift /> About Us
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Actions for guests / non-customer roles */}
            <div className="header-actions">
              <button className="btn" onClick={() => navigate("/login")}>
                <FaUser />
                <span>Login</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/createaccount")}
              >
                <FaUserPlus />
                <span>Register</span>
              </button>

              <button
                className="cart-btn"
                onClick={() => {
                  onCartClick();
                  navigate("/cart");
                }}
                aria-label="Open cart"
              >
                <FaShoppingCart />
                <div className="cart-badge" aria-live="polite">
                  {typeof cartCountProp === "number" ? cartCountProp : cartCount}
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
