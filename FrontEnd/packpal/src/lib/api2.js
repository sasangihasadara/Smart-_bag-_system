// src/lib/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000", // same port as your Express server
  headers: { "Content-Type": "application/json" },
});
