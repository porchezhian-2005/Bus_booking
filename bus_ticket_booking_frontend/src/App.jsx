import React, { useEffect } from "react";
import { Routes, Route } from "react-router";
import { useDispatch } from "react-redux";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Wallet from "./pages/Wallet";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import BusSearchResults from "./pages/BusSearchResults";
import Checkout from "./pages/Checkout";
import BookingConfirmation from "./pages/BookingConfirmation";
import api from "./services/api";
import { setCredentials, logout } from "./features/auth/authSlice";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./components/Toast";

export function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      api.get("/auth/profile")
        .then((res) => {
          if (res.data?.data) {
            dispatch(setCredentials({ user: res.data.data, token, role: res.data.data.role }));
          }
        })
        .catch((err) => {
          console.error("Auto session restore failed:", err);
          if (err.response?.status === 401) {
            dispatch(logout());
          }
        });
    }
  }, [dispatch]);

  return (
    <ToastProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="app-root-container min-h-screen font-sans selection:bg-rose-500 selection:text-white transition-colors duration-300">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bus-results" element={<BusSearchResults />} />
            <Route path="/register" element={<Register />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmation" element={<BookingConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
