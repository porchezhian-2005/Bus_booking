import api from "./api";

export const adminApi = {
  getAnalytics: () => api.get("/buses/analytics"),
  getAllBuses: () => api.get("/buses/all-buses"),
  addBus: (data) => api.post("/buses", data),
  updateBus: (id, data) => api.put(`/buses/${id}`, data),
  deleteBus: (id) => api.delete(`/buses/${id}`),
  decommissionBus: (id, data) => api.post(`/buses/${id}/decommission`, data),
  getAllRoutes: () => api.get("/buses/routes"),
  addRoute: (data) => api.post("/buses/routes", data),
  updateRouteStops: (id, stops) => api.put(`/buses/routes/${id}/stops`, { stops }),
  getAllTrips: () => api.get("/buses/all-trips"),
  createTrip: (data) => api.post("/buses/trips", data),
  updateTrip: (id, data) => api.put(`/buses/trips/${id}`, data),
  getAllBookings: () => api.get("/bookings/all"),
  getCoupons: () => api.get("/coupons"),
  createCoupon: (data) => api.post("/coupons", data),
  getAllReferrals: () => api.get("/referrals/all"),
  updateSystemConfig: (data) => api.put("/config", data),
};

export default adminApi;

