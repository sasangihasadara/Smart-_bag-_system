// src/lib/api.js
import axios from "axios";

// Use REACT_APP_API_URL without trailing slash (e.g., http://localhost:5000)
const raw = process.env.REACT_APP_API_URL || "http://localhost:5000";
const base = raw.replace(/\/+$/, ""); // trim trailing slash

export const api = axios.create({
  baseURL: `${base}/api`,       // << include /api prefix
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
