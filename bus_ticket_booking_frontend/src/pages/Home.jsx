import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import busApi from "../services/busApi";
import walletApi from "../services/walletApi";
import bookingApi from "../services/bookingApi";
import SeatMapModal from "../components/SeatMapModal";
import {
  Search,
  MapPin,
  Calendar,
  Wallet as WalletIcon,
  Gift,
  ChevronRight,
  ArrowRightLeft,
  Filter,
  SlidersHorizontal,
  Star,
  Wifi,
  Zap,
  Coffee,
  ShieldCheck,
  Clock,
  Bus,
  Tag,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const Home = () => {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [walletBalance, setWalletBalance] = useState(0);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [source, setSource] = useState("Chennai");
  const [destination, setDestination] = useState("Bengaluru");
  const [date, setDate] = useState("2026-09-01");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination State
  const [selectedType, setSelectedType] = useState("ALL"); // ALL, AC, SLEEPER, SEATER
  const [sortBy, setSortBy] = useState("CHEAPEST"); // CHEAPEST, EARLIEST, SEATS
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Seat Modal State
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripSeats, setTripSeats] = useState([]);
  const [selectedSeatObjects, setSelectedSeatObjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      fetchWalletFromBackend();
      fetchUpcomingBookingFromBackend();
    }
    fetchTripsFromBackend(source, destination, date, selectedType, sortBy);

    const onFocus = () => {
      fetchTripsFromBackend(source, destination, date, selectedType, sortBy);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token]);

  // Dynamic API Call: Fetch Wallet Balance from Backend DB
  const fetchWalletFromBackend = async () => {
    try {
      const res = await walletApi.getBalance();
      setWalletBalance(res.data.data?.balance || 0);
    } catch (err) {
      console.error("Backend Wallet API Error:", err);
    }
  };

  // Dynamic API Call: Fetch My Bookings from Backend DB
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

  // Server-Side Backend Pagination State (Capacity: 8 buses per page)
  const PAGE_LIMIT = 8;
  const [paginationMeta, setPaginationMeta] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: PAGE_LIMIT,
  });

  // Dynamic API Call: Fetch Bus Trips from Backend DB (Pagination triggers only when totalCount > PAGE_LIMIT)
  const fetchTripsFromBackend = async (srcCity, dstCity, tripDate, bType, sOption, pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        source: srcCity,
        destination: dstCity,
        date: tripDate,
        busType: bType !== "ALL" ? bType : undefined,
        sortBy: sOption,
        page: pageNum,
        limit: PAGE_LIMIT,
      };
      let res = await busApi.searchTrips(params).catch(() => null);
      let data = res?.data?.data || [];
      let pageInfo = res?.data?.pagination || {
        totalCount: data.length,
        totalPages: Math.ceil(data.length / PAGE_LIMIT) || 1,
        currentPage: pageNum,
        limit: PAGE_LIMIT,
      };

      // Fail-Safe Fallback: If search query returned 0, fetch ALL trips from DB
      if (!data || data.length === 0) {
        const allRes = await busApi.getAllTrips().catch(() => null);
        const allTripsData = allRes?.data?.data || [];
        data = allTripsData.slice((pageNum - 1) * PAGE_LIMIT, pageNum * PAGE_LIMIT);
        pageInfo = {
          totalCount: allTripsData.length,
          totalPages: Math.ceil(allTripsData.length / PAGE_LIMIT) || 1,
          currentPage: pageNum,
          limit: PAGE_LIMIT,
        };
      }

      setTrips(data);
      setPaginationMeta(pageInfo);
      setCurrentPage(pageNum);
    } catch (err) {
      console.error("Backend Trips Search API Error:", err);
      try {
        const fallbackRes = await busApi.getAllTrips();
        const fallbackData = fallbackRes?.data?.data || [];
        setTrips(fallbackData.slice(0, PAGE_LIMIT));
        setPaginationMeta({
          totalCount: fallbackData.length,
          totalPages: Math.ceil(fallbackData.length / PAGE_LIMIT) || 1,
          currentPage: 1,
          limit: PAGE_LIMIT,
        });
      } catch (e) {
        setTrips([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchTripsFromBackend(source, destination, date, selectedType, sortBy);
    setTimeout(() => {
      window.scrollTo({ top: 480, behavior: "smooth" });
    }, 200);
  };

  const swapCities = () => {
    const newSource = destination;
    const newDest = source;
    setSource(newSource);
    setDestination(newDest);
    fetchTripsFromBackend(newSource, newDest, date, selectedType, sortBy);
  };

  const handleFilterTypeChange = (newType) => {
    setSelectedType(newType);
    fetchTripsFromBackend(source, destination, date, newType, sortBy);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    fetchTripsFromBackend(source, destination, date, selectedType, newSort);
  };

  // Dynamic API Call: Fetch Seats from Backend DB for selected Trip
  const handleOpenSeatMap = async (trip) => {
    setActiveTrip(trip);
    setSelectedSeatObjects([]);
    try {
      const res = await busApi.getTripSeats(trip.id);
      setTripSeats(res.data.data || []);
      setIsModalOpen(true);
    } catch (err) {
      alert("Failed to load live seat layout from backend API");
    }
  };

  const handleSelectSeat = (seat) => {
    if (selectedSeatObjects.some((s) => s.id === seat.id)) {
      setSelectedSeatObjects(selectedSeatObjects.filter((s) => s.id !== seat.id));
    } else {
      setSelectedSeatObjects([...selectedSeatObjects, seat]);
    }
  };

  const handleProceedToCheckout = () => {
    setIsModalOpen(false);
    navigate("/checkout", {
      state: {
        trip: activeTrip,
        selectedSeats: selectedSeatObjects,
      },
    });
  };

  return (
    <div className="min-h-screen pb-16">
      {/* RedBus Hero Search Banner */}
      <div className="relative home-hero-banner border-b border-rose-500/10 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                India's No. 1 Bus Ticket Booking Platform
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Welcome, <span className="text-rose-400 font-semibold">{user ? user.name : "Guest"}</span> • Dynamic Live API Connected
              </p>
            </div>
          </div>

          {/* RedBus Search Box Card */}
          <div className="glass-card p-5 sm:p-7 rounded-2xl border border-rose-500/20 shadow-2xl relative">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Source Input */}
                <div className="md:col-span-4 relative">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> From City
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter Departure City (e.g. Chennai)"
                    required
                  />
                </div>

                {/* Swap Button */}
                <div className="md:col-span-1 flex justify-center my-1 md:my-0">
                  <button
                    type="button"
                    onClick={swapCities}
                    className="p-2.5 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 hover:border-rose-500 transition-all shadow-md cursor-pointer group"
                    title="Swap Cities"
                  >
                    <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* Destination Input */}
                <div className="md:col-span-4 relative">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> To City
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter Destination City (e.g. Bengaluru)"
                    required
                  />
                </div>

                {/* Date Input */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" /> Journey Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Action Bar & Quick Date Chips */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-semibold">Quick Date:</span>
                  {["Today", "Tomorrow", "Weekend"].map((label, idx) => {
                    const d = new Date();
                    if (idx === 1) d.setDate(d.getDate() + 1);
                    if (idx === 2) d.setDate(d.getDate() + (6 - d.getDay()));
                    const formatted = d.toISOString().split("T")[0];
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setDate(formatted);
                          fetchTripsFromBackend(source, destination, formatted, selectedType, sortBy);
                        }}
                        className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          date === formatted
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                            : "bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wide text-sm shadow-xl shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{loading ? "SEARCHING API..." : "SEARCH BUSES"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Promotional Offers Carousel / Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl glass-card border-rose-500/30 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" /> Save Up to ₹200
              </div>
              <div className="text-sm font-bold text-white">Use Code: REDBUS200</div>
              <div className="text-[11px] text-slate-400">Valid on all AC Sleeper bookings</div>
            </div>
            <Gift className="w-8 h-8 text-rose-500 opacity-80" />
          </div>

          <div className="p-4 rounded-2xl glass-card border-indigo-500/30 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> First Booking Offer
              </div>
              <div className="text-sm font-bold text-white">Use Code: FIRST50</div>
              <div className="text-[11px] text-slate-400">Get 15% Instant Discount</div>
            </div>
            <ShieldCheck className="w-8 h-8 text-indigo-500 opacity-80" />
          </div>

          <div className="p-4 rounded-2xl glass-card border-emerald-500/30 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                <WalletIcon className="w-3.5 h-3.5" /> Wallet Cashback
              </div>
              <div className="text-sm font-bold text-white">Earn ₹50 Cashback</div>
              <div className="text-[11px] text-slate-400">Directly credited to RedBus Wallet</div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
          </div>
        </div>

        {/* Popular Routes Quick Buttons */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Popular Routes</span>
          <div className="flex flex-wrap gap-2">
            {[
              { from: "Chennai", to: "Bengaluru" },
              { from: "Chennai", to: "Coimbatore" },
              { from: "Chennai", to: "Madurai" },
              { from: "Bengaluru", to: "Hyderabad" },
              { from: "Chennai", to: "Pondicherry" },
            ].map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setSource(r.from);
                  setDestination(r.to);
                  fetchTripsFromBackend(r.from, r.to, date, selectedType, sortBy);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:border-rose-500/50 hover:bg-slate-800 transition-all cursor-pointer"
              >
                {r.from} → {r.to}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Upcoming Trip Card from Backend */}
        {upcomingBooking && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upcoming Trip (Live DB)</h2>
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

        {/* Filter & Sorting Controls Toolbar */}
        <div className="glass-card p-4 rounded-2xl border border-slate-300 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          {/* Bus Type Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold w-full sm:w-auto">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1 uppercase tracking-wider text-[11px]">
              <Filter className="w-3.5 h-3.5 text-rose-500" /> Bus Category:
            </span>
            {[
              { id: "ALL", label: "All Buses" },
              { id: "AC", label: "AC" },
              { id: "SLEEPER", label: "Sleeper" },
              { id: "SEATER", label: "Seater" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterTypeChange(f.id)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-extrabold ${
                  selectedType === f.id
                    ? "bg-rose-600 text-white font-black shadow-md shadow-rose-600/30"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-rose-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sorting Options */}
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-end">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 uppercase tracking-wider text-[11px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="CHEAPEST">💰 Lowest Ticket Fare</option>
              <option value="EARLIEST">⏰ Departure Time</option>
              <option value="SEATS">💺 Most Seats Available</option>
            </select>
          </div>
        </div>

        {/* Bus Search Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="w-5 h-5 text-rose-500" />
              <span>
                Buses from {source} to {destination}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-black">
                {trips.length} Available Buses
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
              <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <div className="text-sm font-semibold text-slate-300">Fetching live PostgreSQL database trips...</div>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-white/10 space-y-3">
              <Bus className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-lg font-bold text-white">No Trips Found in Database</div>
              <div className="text-xs text-slate-400">Try searching for Chennai → Bengaluru, Chennai → Coimbatore, or change the journey date.</div>
            </div>
          ) : (
            <>
              {trips
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((t) => (
                  <div
                    key={t.id}
                    className="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 space-y-4 relative overflow-hidden"
                  >
                    {/* Operator Header & Rating */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-white tracking-tight">{t.bus?.name || "Fleet Bus"}</h3>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" /> 4.8
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{t.bus?.busType || "AC Sleeper (2+1)"} • Reg: {t.bus?.busNumber}</p>
                      </div>

                      {/* Amenities Badges */}
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]" title="Free Wi-Fi">
                          <Wifi className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Wi-Fi</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]" title="Power Outlets">
                          <Zap className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Charging</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]" title="Water Bottle">
                          <Coffee className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Water</span>
                        </div>
                      </div>
                    </div>

                    {/* Journey Timings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-1">
                      {/* Departure */}
                      <div>
                        <div className="text-xl font-black text-white">{t.departureTime || "21:30"}</div>
                        <div className="text-xs font-semibold text-rose-400">{t.route?.source || source}</div>
                        <div className="text-[11px] text-slate-400">Boarding: Main Bus Terminal</div>
                      </div>

                      {/* Duration graphic */}
                      <div className="text-center">
                        <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-rose-400" /> {t.route?.durationHours ? `${t.route.durationHours}h` : "6h 30m"}
                        </div>
                        <div className="w-full h-0.5 bg-gradient-to-r from-rose-500 via-slate-600 to-rose-500 my-1 relative">
                          <div className="w-2 h-2 rounded-full bg-rose-500 absolute left-0 -top-0.75"></div>
                          <div className="w-2 h-2 rounded-full bg-rose-500 absolute right-0 -top-0.75"></div>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Non-Stop</div>
                      </div>

                      {/* Arrival */}
                      <div className="sm:text-right">
                        <div className="text-xl font-black text-white">{t.arrivalTime || "04:00 AM"}</div>
                        <div className="text-xs font-semibold text-emerald-400">{t.route?.destination || destination}</div>
                        <div className="text-[11px] text-slate-400">Drop: Central Junction</div>
                      </div>
                    </div>

                    {/* Pricing & Seat CTA Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Starts from</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">₹{t.basePrice}</span>
                            <span className="text-xs text-slate-500 line-through">₹{Math.round(parseFloat(t.basePrice) * 1.2)}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
                          {t.availableSeats !== undefined ? t.availableSeats : 25} Seats left
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenSeatMap(t)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold tracking-wide shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>SELECT SEATS</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* Dynamic Server-Side Backend Pagination Controls */}
              {paginationMeta.totalPages > 1 && (
                <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                  <span className="text-slate-400 font-medium">
                    Showing Page <span className="text-white font-bold">{paginationMeta.currentPage}</span> of{" "}
                    <span className="text-white font-bold">{paginationMeta.totalPages}</span> ({paginationMeta.totalCount} Total Live Buses in Database)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={paginationMeta.currentPage === 1}
                      onClick={() => {
                        const target = Math.max(paginationMeta.currentPage - 1, 1);
                        fetchTripsFromBackend(source, destination, date, selectedType, sortBy, target);
                        window.scrollTo({ top: 480, behavior: "smooth" });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 font-semibold hover:border-slate-500 transition-all cursor-pointer"
                    >
                      Previous
                    </button>

                    {Array.from({ length: paginationMeta.totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => {
                          fetchTripsFromBackend(source, destination, date, selectedType, sortBy, pageNum);
                          window.scrollTo({ top: 480, behavior: "smooth" });
                        }}
                        className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                          paginationMeta.currentPage === pageNum
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                            : "bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      disabled={paginationMeta.currentPage === paginationMeta.totalPages}
                      onClick={() => {
                        const target = Math.min(paginationMeta.currentPage + 1, paginationMeta.totalPages);
                        fetchTripsFromBackend(source, destination, date, selectedType, sortBy, target);
                        window.scrollTo({ top: 480, behavior: "smooth" });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 font-semibold hover:border-slate-500 transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seat Map Modal */}
      <SeatMapModal
        isOpen={isModalOpen}
        onClose={handleProceedToCheckout}
        seats={tripSeats}
        selectedSeats={selectedSeatObjects.map((s) => s.id)}
        onSelectSeat={handleSelectSeat}
        trip={activeTrip}
      />
    </div>
  );
};

export default Home;
