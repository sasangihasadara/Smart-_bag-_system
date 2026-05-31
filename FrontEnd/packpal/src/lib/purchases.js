// src/lib/purchases.js
import { api } from "./api1";

export const purchases = {
  // GET /api/purchases
  list: (params = {}) => api.get("/api/purchases", { params }),

  // GET /api/purchases/:id
  get: (id) => api.get(`/api/purchases/${encodeURIComponent(id)}`),

  // POST /api/purchases  (id optional; server can auto-generate)
  create: (data) => api.post("/api/purchases", data),

  // PUT /api/purchases/:id
  update: (id, data) => api.put(`/api/purchases/${encodeURIComponent(id)}`, data),

  // DELETE /api/purchases/:id
  remove: (id) => api.delete(`/api/purchases/${encodeURIComponent(id)}`),

  // PATCH /api/purchases/:id/status
  setStatus: (id, status) =>
    api.patch(`/api/purchases/${encodeURIComponent(id)}/status`, { status }),
};
