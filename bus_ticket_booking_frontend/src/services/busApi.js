import api from "./api";

export const busApi = {
  searchTrips: (params) => api.get("/buses/search", { params }),
  getAllTrips: () => api.get("/buses/all-trips"),
  getTripSeats: (tripId) => api.get(`/buses/trips/${tripId}/seats`),
};

export default busApi;
