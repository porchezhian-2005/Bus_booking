import api from "./api";

export const walletApi = {
  getBalance: () => api.get("/wallet/balance"),
  addMoney: (amount) => api.post("/wallet/add-money", { amount }),
  getTransactions: () => api.get("/wallet/transactions"),
  addMoneyViaRazorpay: (data) => api.post("/payments/razorpay/add-wallet-money", data),
};

export default walletApi;
