import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import bookingApi from "../services/bookingApi";
import walletApi from "../services/walletApi";
import loadRazorpayScript from "../services/razorpay";
import toast from "react-hot-toast";
import { User, Ticket, CreditCard, Tag, Wallet as WalletIcon, ShieldAlert, Bus, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

export const Checkout = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { trip, selectedSeats } = location.state || {};

  const [passengers, setPassengers] = useState(
    (selectedSeats || []).map((seat) => ({
      seatNumber: seat.seatNumber,
      name: "",
      age: "",
      gender: "",
    }))
  );

  const [useWallet, setUseWallet] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [maxWalletPercent, setMaxWalletPercent] = useState(20);
  const [paymentMethod, setPaymentMethod] = useState("UPI"); // UPI, CARD, NETBANKING
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWalletAndConfig();
  }, []);

  const fetchWalletAndConfig = async () => {
    try {
      const wRes = await walletApi.getBalance();
      setWalletBalance(parseFloat(wRes.data.data.balance || 0));
      const cRes = await bookingApi.getSystemConfig();
      setMaxWalletPercent(parseFloat(cRes.data.data.walletMaxUsagePercent || 20));
    } catch (err) {
      console.error(err);
    }
  };

  if (!trip || !selectedSeats || selectedSeats.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 text-center text-slate-400 glass-card p-8 rounded-3xl border border-rose-500/20">
        <Bus className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">No Seats Selected</h3>
        <p className="text-xs mb-4">Please return to the search page to pick your seats first.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const baseTotal = selectedSeats.reduce((sum, s) => sum + parseFloat(s.price), 0);
  const maxAllowedWallet = (baseTotal * maxWalletPercent) / 100;
  const actualWalletUsed = useWallet ? Math.min(walletBalance, maxAllowedWallet, baseTotal - discountAmount) : 0;
  const finalPayable = Math.max(0, baseTotal - discountAmount - actualWalletUsed);

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const applyCouponCode = async (codeToApply) => {
    if (useWallet) {
      setError("Coupons and Wallet balance cannot be combined.");
      return;
    }
    setError("");
    try {
      const res = await bookingApi.validateCoupon({
        code: codeToApply,
        bookingAmount: baseTotal,
        useWallet: false,
      });
      setDiscountAmount(parseFloat(res.data.data.discountAmount));
      setCouponCode(codeToApply);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid coupon code");
    }
  };

  const handleApplyCouponForm = (e) => {
    e.preventDefault();
    applyCouponCode(couponCode);
  };

  const handleBookingSubmission = async () => {

    if (loading) return; // Duplicate submission protection

    // Validate passengers input
    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].name || !passengers[i].age) {
        setError(`Please enter complete details (Full Name & Age) for Passenger ${i + 1} (Seat ${passengers[i].seatNumber})`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setLoading(true);
    setError("");

    const baseBookingPayload = {
      tripId: trip.id,
      seatIds: selectedSeats.map((s) => s.id),
      passengers,
      couponCode: couponCode || null,
      useWallet,
    };

    // Case 1: 100% covered by Wallet or Coupon (No payment gateway needed)
    if (finalPayable === 0) {
      try {
        const res = await bookingApi.createBooking(baseBookingPayload);
        toast.success("Booking confirmed successfully!");
        navigate("/confirmation", { state: { booking: res.data.data } });
      } catch (err) {
        setError(err.response?.data?.message || "Booking creation failed");
        toast.error(err.response?.data?.message || "Booking creation failed");
        setLoading(false);
      }
      return;
    }

    // Case 2: Remaining cost > 0 -> Razorpay TEST Payment Flow
    try {
      // Step A: Request Razorpay TEST Order from backend using selection parameters (Backend calculates amount)
      toast.loading("Creating Razorpay TEST order...", { id: "checkout-process" });
      const orderRes = await bookingApi.createRazorpayOrder(baseBookingPayload);
      const orderData = orderRes.data?.data || orderRes.data;

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to generate Razorpay TEST order ID from server");
      }

      // Step B: Load Razorpay SDK Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your network connection.");
      }

      toast.dismiss("checkout-process");

      // Step C: Initialize Razorpay TEST Checkout Modal
      const options = {
        key: orderData.key || "rzp_test_dummy_key",
        amount: orderData.amount || Math.round(finalPayable * 100),
        currency: orderData.currency || "INR",
        name: "RedBus Ticket Booking",
        description: `Booking ${selectedSeats.length} Seat(s) for ${trip?.bus?.name || "Fleet Bus"} (TEST Mode)`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment with backend...", { id: "verify-process" });
            const verifyPayload = {
              ...baseBookingPayload,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            // Step D: Send payment signature & booking data to backend verification API
            const bookingRes = await bookingApi.createBooking(verifyPayload);
            toast.success("Payment verified & booking confirmed!", { id: "verify-process" });
            navigate("/confirmation", { state: { booking: bookingRes.data.data } });
          } catch (verifyErr) {
            console.error("Backend Verification Failed:", verifyErr);
            const errMsg = verifyErr.response?.data?.message || "Payment verification failed!";
            setError(errMsg);
            toast.error(errMsg, { id: "verify-process" });
            setLoading(false);
          }
        },
        prefill: {
          name: passengers[0]?.name || "Test Passenger",
          email: "user@example.com",
        },
        theme: {
          color: "#f43f5e",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.error("Payment cancelled by user.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setLoading(false);
        toast.error(response.error?.description || "Payment failed!");
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay Order Setup Error:", err);
      toast.dismiss("checkout-process");
      setError(err.response?.data?.message || err.message || "Payment setup failed");
      toast.error(err.response?.data?.message || err.message || "Payment setup failed");
      setLoading(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* RedBus Header Info */}
      <div className="glass-card p-6 rounded-3xl border border-rose-500/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase">
              {trip?.bus?.busType || "AC Sleeper"}
            </span>
            <h1 className="text-xl font-extrabold text-white">{trip?.bus?.name || "Fleet Bus"}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {trip?.route?.source} → {trip?.route?.destination} | Journey Date: {trip?.departureDate} at {trip?.departureTime}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 text-xs">
          <Ticket className="w-4 h-4 text-rose-400" />
          <span className="text-slate-300">Selected Seats ({selectedSeats.length}):</span>
          <span className="font-extrabold text-white">{selectedSeats.map((s) => s.seatNumber).join(", ")}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Passenger Info & Payments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Passenger Information Cards */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <User className="w-5 h-5 text-rose-500" />
              <span>Passenger Information</span>
            </h2>

            <div className="space-y-4">
              {passengers.map((p, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-rose-400 uppercase tracking-wider">
                    <span>Passenger {idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      Seat {p.seatNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="Enter passenger full name (e.g., John Doe)"
                        value={p.name}
                        onChange={(e) => handlePassengerChange(idx, "name", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Age</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Enter age (e.g., 25)"
                        value={p.age}
                        onChange={(e) => handlePassengerChange(idx, "age", e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value !== "") {
                            const clamped = Math.max(1, Math.min(120, parseInt(e.target.value) || 1));
                            handlePassengerChange(idx, "age", clamped);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Gender</label>
                      <select
                        value={p.gender}
                        onChange={(e) => handlePassengerChange(idx, "gender", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold cursor-pointer"
                        required
                      >
                        <option value="" disabled>Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discounts & Payment Modes */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>Offers & Payment Method</span>
            </h2>

            {/* Wallet Toggle Option */}
            <label
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                useWallet
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                  : "bg-slate-950/40 border-white/10 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => {
                    setUseWallet(e.target.checked);
                    if (e.target.checked) setCouponCode("");
                  }}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <WalletIcon className="w-4 h-4 text-emerald-400" />
                    <span>Pay with RedBus Wallet</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Available Balance: ₹{walletBalance.toFixed(2)} (Max {maxWalletPercent}% discount: ₹{maxAllowedWallet.toFixed(2)})
                  </div>
                </div>
              </div>
              {useWallet && <span className="text-xs font-black text-emerald-400">-₹{actualWalletUsed.toFixed(2)}</span>}
            </label>

            {/* Promo Coupon Form */}
            <div className={`p-4 rounded-2xl border transition-all ${!useWallet ? "bg-slate-950/60 border-slate-800" : "opacity-40"}`}>
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-rose-400" />
                <span>Apply RedBus Promo Coupon</span>
              </div>
              <form onSubmit={handleApplyCouponForm} className="flex gap-2 mb-3">
                <input
                  type="text"
                  disabled={useWallet}
                  placeholder="Enter Coupon (e.g. REDBUS200)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="px-3.5 py-2 rounded-xl glass-input text-xs font-bold uppercase tracking-wider w-full"
                />
                <button
                  type="submit"
                  disabled={useWallet}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-extrabold transition-all cursor-pointer"
                >
                  Apply
                </button>
              </form>

              {/* Suggested Coupons Pills */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                {["REDBUS200", "FIRST50"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={useWallet}
                    onClick={() => applyCouponCode(code)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    Use {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Options simulation */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Mode</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "UPI", label: "UPI / GPay" },
                  { id: "CARD", label: "Credit/Debit Card" },
                  { id: "NETBANKING", label: "NetBanking" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === mode.id
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Fare Breakdown Summary */}
        <div className="lg:col-span-4">
          <div className="glass-card p-6 rounded-3xl border border-rose-500/20 space-y-5 sticky top-24 shadow-2xl">
            <h2 className="text-base font-extrabold text-white border-b border-white/10 pb-3">Fare Summary</h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Seat Base Fare ({selectedSeats.length} Seats)</span>
                <span>₹{baseTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Taxes & GST (Included)</span>
                <span className="text-emerald-400">₹0.00</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              {actualWalletUsed > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Wallet Discount</span>
                  <span>-₹{actualWalletUsed.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Total Payable</span>
              <span className="text-2xl font-black text-rose-400">₹{finalPayable.toFixed(2)}</span>
            </div>

            <button
              onClick={handleBookingSubmission}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wide text-sm shadow-xl shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loading ? "PROCESSING..." : "PAY & CONFIRM BOOKING"}</span>
            </button>

            <div className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>100% Secure & Instant RedBus Confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
