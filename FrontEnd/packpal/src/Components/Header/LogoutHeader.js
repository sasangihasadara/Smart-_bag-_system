// src/Components/Header/LogoutHeader.js
import React, { useEffect, useState } from "react";
import {
  FaHome, FaLayerGroup, FaPuzzlePiece, FaTags, FaGift,
  FaChevronDown, FaShoppingCart,
} from "react-icons/fa";
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./Header.css";

const STORAGE_KEY = "packPalCart";

export default function LogoutHeader({
  cartCount: cartCountProp,   // optional override
  onCartClick = () => {},
  onDropdown = () => {},
}) {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  // read cart count from localStorage
  const readCount = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    // initialize
    setCartCount(
      typeof cartCountProp === "number" ? cartCountProp : readCount()
    );

    const refresh = () => {
      setCartCount(readCount());
    };

    // react to localStorage/cart updates
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

  const handleLogout = () => {
    localStorage.removeItem("pp:token");
    localStorage.removeItem("pp:user");
    window.dispatchEvent(new Event("pp:auth:changed")); // notify switcher
    navigate("/home", { replace: true });
  };

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

            {/* Primary Nav (storefront only) */}
            <nav className="nav" aria-label="Primary">
              <ul className="nav-list">
                <li className="nav-item">
                  <NavLink to="/home" className="nav-link">
                    <FaHome /> Home
                  </NavLink>
                </li>

                <li className="nav-item has-dropdown">
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
                      <div className="dropdown-desc">Fun and colorful bags for children</div>
                    </NavLink>
                    <NavLink
                      to="/totebag"
                      className="dropdown-item"
                      onClick={() => onDropdown("Tote Bag")}
                    >
                      <div className="dropdown-title">Tote Bag</div>
                      <div className="dropdown-desc">Spacious and versatile everyday bags</div>
                    </NavLink>
                    <NavLink
                      to="/handbag"
                      className="dropdown-item"
                      onClick={() => onDropdown("Handbag")}
                    >
                      <div className="dropdown-title">Handbag</div>
                      <div className="dropdown-desc">Elegant bags for special occasions</div>
                    </NavLink>
                    <NavLink
                      to="/clutches"
                      className="dropdown-item"
                      onClick={() => onDropdown("Clutch")}
                    >
                      <div className="dropdown-title">Clutch</div>
                      <div className="dropdown-desc">Compact and stylish evening bags</div>
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

            {/* Actions */}
            <div className="header-actions">
              <button
                className="btn btn-logout"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Logout"
              >
                Logout
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
