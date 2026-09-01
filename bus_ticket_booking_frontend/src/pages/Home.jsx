import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import walletApi from "../services/walletApi";
import bookingApi from "../services/bookingApi";
import {
  Search,
  MapPin,
  Calendar,
  Wallet as WalletIcon,
  Gift,
  ChevronRight,
  ArrowRightLeft,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { useForm } from "react-hook-form";

export const Home = () => {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [walletBalance, setWalletBalance] = useState(0);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [isWeekendMenuOpen, setIsWeekendMenuOpen] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const tmrDate = new Date(now);
  tmrDate.setDate(now.getDate() + 1);
  const tmrStr = tmrDate.toISOString().split("T")[0];

  const dayOfWeek = now.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
  const satOffset = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const sunOffset = dayOfWeek === 6 ? 1 : 7 - dayOfWeek;

  const satDate = new Date(now);
  satDate.setDate(now.getDate() + satOffset);
  const satStr = satDate.toISOString().split("T")[0];
  const satDisplay = satDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const sunDate = new Date(now);
  sunDate.setDate(now.getDate() + sunOffset);
  const sunStr = sunDate.toISOString().split("T")[0];
  const sunDisplay = sunDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      source: "",
      destination: "",
      date: "",
    },
  });

  const sourceVal = watch("source");
  const destVal = watch("destination");
  const dateVal = watch("date");

  const isTodaySelected = Boolean(dateVal && dateVal === todayStr);
  const isTomorrowSelected = Boolean(dateVal && dateVal === tmrStr && !isTodaySelected);
  const isWeekendSelected = Boolean(dateVal && (dateVal === satStr || dateVal === sunStr) && !isTodaySelected && !isTomorrowSelected);

  useEffect(() => {
    if (token) {
      fetchWalletFromBackend();
      fetchUpcomingBookingFromBackend();
    }
  }, [token]);

  const fetchWalletFromBackend = async () => {
    try {
      const res = await walletApi.getBalance();
      setWalletBalance(res.data.data?.balance || 0);
    } catch (err) {
      console.error("Backend Wallet API Error:", err);
    }
  };

  const fetchUpcomingBookingFromBackend = async () => {
    try {
      const res = await bookingApi.getMyBookings();
      if (res.data.data && res.data.data.length > 0) {
        const confirmed = res.data.data.find((b) => b.bookingStatus === "CONFIRMED");
        if (confirmed) setUpcomingBooking(confirmed);
      }
    } catch (err) {
      console.error("Backend Bookings API Error:", err);
    }
  };

  const onSubmit = (data) => {
    const params = new URLSearchParams();
    if (data.source) params.set("source", data.source);
    if (data.destination) params.set("destination", data.destination);
    if (data.date) params.set("date", data.date);

    navigate(`/bus-results?${params.toString()}`, {
      state: { source: data.source, destination: data.destination, date: data.date },
    });
  };

  const swapCities = () => {
    const curSource = sourceVal;
    const curDest = destVal;
    setValue("source", curDest, { shouldValidate: true });
    setValue("destination", curSource, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen pb-16">
      {/* RedBus Hero Search Banner */}
      <div className="relative home-hero-banner pt-4 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                India's No. 1 Bus Ticket Booking Platform
              </h1>
              <p className="text-sm sm:text-base text-slate-300 font-semibold mt-1">
                Welcome, <span className="text-rose-400 font-bold">{user ? user.name : "Guest"}</span>
              </p>
            </div>
          </div>

          {/* RedBus Search Box Card */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/30 shadow-2xl relative z-30">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Source Input */}
                <div className="md:col-span-4 relative">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" /> From City
                  </label>
                  <input
                    type="text"
                    {...register("source", {
                      required: "Departure city is required.",
                      validate: (val) => {
                        if (destVal && val && val.trim().toLowerCase() === destVal.trim().toLowerCase()) {
                          return "Departure and destination cities must be different.";
                        }
                        return true;
                      },
                    })}
                    className={`w-full px-5 py-3.5 rounded-2xl glass-input text-base font-bold transition-all focus:ring-2 ${
                      errors.source ? "border-rose-500 focus:ring-rose-500" : "focus:ring-rose-500"
                    }`}
                    placeholder="Enter Departure City (e.g. Chennai)"
                  />
                  {errors.source && (
                    <p className="text-xs font-extrabold text-rose-500 mt-1.5 flex items-center gap-1">
                      <span>⚠️</span> {errors.source.message}
                    </p>
                  )}
                </div>

                {/* Swap Button */}
                <div className="md:col-span-1 flex justify-center my-1 md:my-0 pt-6">
                  <button
                    type="button"
                    onClick={swapCities}
                    className="p-3 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 transition-all shadow-lg cursor-pointer group"
                    title="Swap Cities"
                  >
                    <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* Destination Input */}
                <div className="md:col-span-4 relative">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" /> To City
                  </label>
                  <input
                    type="text"
                    {...register("destination", {
                      required: "Destination city is required.",
                      validate: (val) => {
                        if (sourceVal && val && val.trim().toLowerCase() === sourceVal.trim().toLowerCase()) {
                          return "Departure and destination cities must be different.";
                        }
                        return true;
                      },
                    })}
                    className={`w-full px-5 py-3.5 rounded-2xl glass-input text-base font-bold transition-all focus:ring-2 ${
                      errors.destination ? "border-rose-500 focus:ring-rose-500" : "focus:ring-rose-500"
                    }`}
                    placeholder="Enter Destination City (e.g. Bengaluru)"
                  />
                  {errors.destination && (
                    <p className="text-xs font-extrabold text-rose-500 mt-1.5 flex items-center gap-1">
                      <span>⚠️</span> {errors.destination.message}
                    </p>
                  )}
                </div>

                {/* Date Input */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-400" /> Journey Date
                  </label>
                  <input
                    type="date"
                    {...register("date", {
                      required: "Journey date is required.",
                      validate: (val) => {
                        if (!val) return "Journey date is required.";
                        if (val < todayStr) {
                          return "Please select today or a future date.";
                        }
                        return true;
                      },
                    })}
                    className={`w-full px-5 py-3.5 rounded-2xl glass-input text-base font-bold transition-all focus:ring-2 ${
                      errors.date ? "border-rose-500 focus:ring-rose-500" : "focus:ring-rose-500"
                    }`}
                  />
                  {errors.date && (
                    <p className="text-xs font-extrabold text-rose-500 mt-1.5 flex items-center gap-1">
                      <span>⚠️</span> {errors.date.message}
                    </p>
                  )}
                </div>
              </div>


              {/* Action Bar & Quick Date Chips */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-300 font-bold text-sm">Quick Date:</span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWeekendMenuOpen(false);
                      setValue("date", todayStr, { shouldValidate: true });
                    }}
                    className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isTodaySelected
                        ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                        : "bg-slate-800/80 text-slate-200 border-slate-700 hover:border-rose-500"
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWeekendMenuOpen(false);
                      setValue("date", tmrStr, { shouldValidate: true });
                    }}
                    className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isTomorrowSelected
                        ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                        : "bg-slate-800/80 text-slate-200 border-slate-700 hover:border-rose-500"
                    }`}
                  >
                    Tomorrow
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsWeekendMenuOpen((prev) => !prev)}
                      className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isWeekendSelected
                          ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                          : "bg-slate-800/80 text-slate-200 border-slate-700 hover:border-rose-500"
                      }`}
                    >
                      Weekend
                    </button>

                    {isWeekendMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsWeekendMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 p-2 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setValue("date", satStr, { shouldValidate: true });
                              setIsWeekendMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-rose-600 hover:text-white transition-all flex justify-between items-center cursor-pointer"
                          >
                            <span>Saturday</span>
                            <span className="text-[10px] opacity-80">{satDisplay}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setValue("date", sunStr, { shouldValidate: true });
                              setIsWeekendMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-rose-600 hover:text-white transition-all flex justify-between items-center cursor-pointer"
                          >
                            <span>Sunday</span>
                            <span className="text-[10px] opacity-80">{sunDisplay}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wider text-base shadow-xl shadow-rose-600/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  <span>SEARCH BUSES</span>
                </button>
              </div>
            </form>
          </div>

          {/* Promotional Offers Banners (Tightly Integrated) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl glass-card border-rose-500/30 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-500 uppercase tracking-wider">
                  <Tag className="w-4 h-4" /> Save Up to ₹200
                </div>
                <div className="text-base font-black text-white">Use Code: REDBUS200</div>
                <div className="text-xs text-slate-300 font-medium">Valid on all AC Sleeper bookings</div>
              </div>
              <Gift className="w-9 h-9 text-rose-500 opacity-90" />
            </div>

            <div className="p-5 rounded-2xl glass-card border-indigo-500/30 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> First Booking Offer
                </div>
                <div className="text-base font-black text-white">Use Code: FIRST50</div>
                <div className="text-xs text-slate-300 font-medium">Get 15% Instant Discount</div>
              </div>
              <ShieldCheck className="w-9 h-9 text-indigo-400 opacity-90" />
            </div>

            <div className="p-5 rounded-2xl glass-card border-emerald-500/30 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                  <WalletIcon className="w-4 h-4" /> Wallet Cashback
                </div>
                <div className="text-base font-black text-white">Earn ₹50 Cashback</div>
                <div className="text-xs text-slate-300 font-medium">Directly credited to RedBus Wallet</div>
              </div>
              <CheckCircle2 className="w-9 h-9 text-emerald-400 opacity-90" />
            </div>
          </div>

          {/* Dynamic Upcoming Trip Card */}
          {upcomingBooking && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upcoming Trip</h2>
              <Link
                to="/my-bookings"
                className="glass-card p-4 border border-rose-500/30 rounded-2xl flex justify-between items-center hover:border-rose-400 transition-all"
              >
                <div>
                  <div className="text-sm font-bold text-white">
                    {upcomingBooking.trip?.route ? `${upcomingBooking.trip.route.source} → ${upcomingBooking.trip.route.destination}` : "Scheduled Trip"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {upcomingBooking.trip?.departureDate} at {upcomingBooking.trip?.departureTime} • PNR: <span className="text-rose-400 font-bold">{upcomingBooking.pnr}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
