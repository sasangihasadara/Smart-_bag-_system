// src/lib/api.js
import axios from "axios";

// CRA uses REACT_APP_* environment variables
const BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Optional: log errors to console for debugging
api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.warn(
      "[API ERROR]",
      err?.message,
      "| url:", err?.config?.baseURL + err?.config?.url,
      "| status:", err?.response?.status
    );
    return Promise.reject(err);
  }
);
