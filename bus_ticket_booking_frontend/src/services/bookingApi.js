import api from "./api";

export const bookingApi = {
  createBooking: (data) => api.post("/bookings", data),
  getMyBookings: () => api.get("/bookings/my-bookings"),
  getTicketByPnr: (pnr) => api.get(`/tickets/${pnr}`),
  downloadPdfTicket: (pnr) => api.get(`/tickets/${pnr}/pdf`, { responseType: "blob" }),
  cancelTicket: (pnr) => api.post("/tickets/cancel", { pnr }),
  validateCoupon: (data) => api.post("/coupons/validate", data),
  getActiveCoupons: () => api.get("/coupons"),
  createRazorpayOrder: (data) => api.post("/payments/razorpay/create-order", data),
  cancelRazorpayHold: (data) => api.post("/payments/razorpay/cancel-hold", data),
  verifyRazorpayPayment: (data) => api.post("/payments/razorpay/verify", data),
  getSystemConfig: () => api.get("/config"),
};

export default bookingApi;
