import api from "./api";

export const adminApi = {
  getAnalytics: () => api.get("/buses/analytics"),
  addBus: (data) => api.post("/buses", data),
  updateBus: (id, data) => api.put(`/buses/${id}`, data),
  deleteBus: (id) => api.delete(`/buses/${id}`),
  addRoute: (data) => api.post("/buses/routes", data),
  createTrip: (data) => api.post("/buses/trips", data),
  createCoupon: (data) => api.post("/coupons", data),
  getAllBookings: () => api.get("/bookings/all"),
  getAllReferrals: () => api.get("/referrals/all"),
  updateSystemConfig: (data) => api.put("/config", data),
};

export default adminApi;
