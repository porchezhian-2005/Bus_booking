import axios from "axios";
import { API_BASE_URL } from "../constants/config";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. Request Interceptor: Attach access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Auto-Refresh Access Token on 401 Expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 / Token Expired & request hasn't been retried yet
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (storedRefreshToken) {
          console.log("🔄 Access token expired! Requesting new access token via refresh token...");

          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken: storedRefreshToken,
          });

          if (refreshRes.data && refreshRes.data.data) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshRes.data.data;

            // Save new tokens to localStorage
            localStorage.setItem("accessToken", newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem("refreshToken", newRefreshToken);
            }

            // Retry original request with new Access Token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            console.log("✅ New access token acquired! Retrying original request...");
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("❌ Token Refresh Failed! Clearing session & redirecting to login:", refreshError.message);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
