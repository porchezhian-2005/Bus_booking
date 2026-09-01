import api from "./api";

export const walletApi = {
  getBalance: () => api.get("/wallet/balance"),
  getTransactions: () => api.get("/wallet/transactions"),
};

export default walletApi;
