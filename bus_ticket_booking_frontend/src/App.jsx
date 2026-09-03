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
import ProtectedRoute from "./components/ProtectedRoute";
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
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />

            {/* Customer-Only Protected Routes */}
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute requireCustomer>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute requireCustomer>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireCustomer>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute requireCustomer>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confirmation"
              element={
                <ProtectedRoute requireCustomer>
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />

            {/* Admin-Only Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
