
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import busApi from "../services/busApi";
import SeatMapModal from "../components/SeatMapModal";
import {
  Search,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRightLeft,
  Filter,
  SlidersHorizontal,
  Wifi,
  Zap,
  Coffee,
  Clock,
  Bus,
} from "lucide-react";

export const BusSearchResults = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  // Parse search parameters from location.state OR URL query string
  const queryParams = new URLSearchParams(location.search);
  const initialSource = location.state?.source || queryParams.get("source") || "";
  const initialDestination = location.state?.destination || queryParams.get("destination") || "";
  const initialDate = location.state?.date || queryParams.get("date") || new Date().toISOString().split("T")[0];

  const [source, setSource] = useState(initialSource);
  const [destination, setDestination] = useState(initialDestination);
  const [date, setDate] = useState(initialDate);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeErrorMessage, setRouteErrorMessage] = useState(null);

  // Filters & Pagination State
  const [selectedType, setSelectedType] = useState("ALL"); // ALL, AC, SLEEPER, SEATER
  const [sortBy, setSortBy] = useState(""); // Default empty (no sorting applied unless chosen)
  const PAGE_LIMIT = 8;
  const [paginationMeta, setPaginationMeta] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: PAGE_LIMIT,
  });

  // Seat Modal State
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripSeats, setTripSeats] = useState([]);
  const [selectedSeatObjects, setSelectedSeatObjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const qParams = new URLSearchParams(location.search);
    const src = location.state?.source !== undefined ? location.state.source : (qParams.get("source") || "");
    const dst = location.state?.destination !== undefined ? location.state.destination : (qParams.get("destination") || "");
    const dt = location.state?.date || qParams.get("date") || new Date().toISOString().split("T")[0];

    setSource(src);
    setDestination(dst);
    setDate(dt);

    fetchTripsFromBackend(src, dst, dt, selectedType, sortBy, 1);
  }, [location.search, location.state, selectedType, sortBy]);


  // Helper to calculate exact journey duration from departure & arrival time
  const calculateTripDuration = (deptTime, arrTime, routeDurationHours) => {
    if (!deptTime || !arrTime) return "6h 30m";
    
    try {
      const parseTimeToMinutes = (timeStr) => {
        let clean = timeStr.trim().toUpperCase();
        let isPM = clean.includes("PM");
        let isAM = clean.includes("AM");
        clean = clean.replace("AM", "").replace("PM", "").trim();

        let parts = clean.split(":");
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1] || "0", 10);

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      let start = parseTimeToMinutes(deptTime);
      let end = parseTimeToMinutes(arrTime);

      if (end < start) end += 24 * 60;

      let diffMinutes = end - start;
      let hours = Math.floor(diffMinutes / 60);
      let minutes = diffMinutes % 60;

      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } catch (e) {
      if (routeDurationHours) {
        let h = Math.floor(parseFloat(routeDurationHours));
        let m = Math.round((parseFloat(routeDurationHours) - h) * 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      }
      return "6h 30m";
    }
  };

  const fetchTripsFromBackend = async (srcCity, dstCity, tripDate, bType, sOption, pageNum = 1) => {
    setLoading(true);
    setRouteErrorMessage(null);
    try {
      const params = {
        source: srcCity,
        destination: dstCity,
        date: tripDate,
        busType: bType !== "ALL" ? bType : undefined,
        sortBy: sOption || undefined,
        page: pageNum,
        limit: PAGE_LIMIT,
      };
      let res = await busApi.searchTrips(params).catch((err) => err.response || null);

      if (res?.data?.success === false || res?.status >= 400) {
        setTrips([]);
        setRouteErrorMessage(res?.data?.message || "Route is not available.");
        setPaginationMeta({
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          limit: PAGE_LIMIT,
        });
        return;
      }

      let data = res?.data?.data || [];
      let pageInfo = res?.data?.pagination || {
        totalCount: data.length,
        totalPages: Math.ceil(data.length / PAGE_LIMIT) || 1,
        currentPage: pageNum,
        limit: PAGE_LIMIT,
      };

      setTrips(data);
      setPaginationMeta(pageInfo);
    } catch (err) {
      console.error("Backend Trips Search API Error:", err);
      setTrips([]);
      setRouteErrorMessage(err?.response?.data?.message || "Failed to fetch trips.");
      setPaginationMeta({
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        limit: PAGE_LIMIT,
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchTripsFromBackend(source, destination, date, selectedType, sortBy, 1);
  };

  const swapCities = () => {
    const newSource = destination;
    const newDest = source;
    setSource(newSource);
    setDestination(newDest);
  };

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
      {/* Top Search Modify Bar */}
      <div className="relative bg-slate-900 border-b border-rose-500/10 py-6 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Source Input */}
            <div className="md:col-span-4 relative">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> From City
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-rose-500"
                placeholder="Enter Departure City"
                required
              />
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center my-1 md:my-0">
              <button
                type="button"
                onClick={swapCities}
                className="p-2 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer group"
                title="Swap Cities"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
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
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-medium focus:ring-2 focus:ring-rose-500"
                placeholder="Enter Destination City"
                required
              />
            </div>

            {/* Date Input */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-medium focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {/* Search Button */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>MODIFY</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Popular Routes Quick Selection */}
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
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:border-rose-500/50 hover:bg-slate-800 transition-all cursor-pointer"
              >
                {r.from} → {r.to}
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Sorting Controls Toolbar - Shown only when buses are available */}
        {trips.length > 0 && (
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
                  onClick={() => setSelectedType(f.id)}
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
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="">Default Order</option>
                <option value="CHEAPEST">💰 Lowest Ticket Fare</option>
                <option value="EARLIEST">⏰ Departure Time</option>
                <option value="SEATS">💺 Most Seats Available</option>
              </select>
            </div>
          </div>
        )}


        {/* Bus Search Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="w-5 h-5 text-rose-500" />
              <span>
                {destination && destination.trim() !== ""
                  ? `Available Buses from ${source} to ${destination}`
                  : `Available Buses from ${source}`}
              </span>
              <span className="px-3.5 py-1 rounded-full bg-rose-600 text-white border border-rose-500 text-xs font-extrabold shadow-md inline-flex items-center justify-center">
                {trips.length} Available Trips
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Searching available bus routes...</div>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
              <Bus className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {routeErrorMessage ? "Route Not Available" : "No Buses Available"}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {routeErrorMessage || "No scheduled buses match your search criteria for this date. Please try another date or route."}
              </div>
            </div>
          ) : (
            <>
              {trips.map((t) => (
                <div
                  key={t.id}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-300 dark:border-white/10 space-y-4 relative overflow-hidden bg-slate-900/90 text-white"
                >
                  {/* Operator Header & Info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700/50 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white tracking-tight">{t.bus?.name || "Fleet Bus"}</h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{t.bus?.busType || "AC Sleeper (2+1)"} • Reg: {t.bus?.busNumber}</p>
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
                      <div className="text-xs font-bold text-rose-400">{t.route?.source || source}</div>
                      <div className="text-[11px] text-slate-300">Boarding: Main Bus Terminal</div>
                    </div>

                    {/* Duration graphic */}
                    <div className="text-center">
                      <div className="text-[11px] text-slate-300 font-semibold flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-rose-400" /> {calculateTripDuration(t.departureTime, t.arrivalTime, t.route?.durationHours)}
                      </div>
                      <div className="w-full h-0.5 bg-gradient-to-r from-rose-500 via-slate-600 to-rose-500 my-1 relative">
                        <div className="w-2 h-2 rounded-full bg-rose-500 absolute left-0 -top-0.75"></div>
                        <div className="w-2 h-2 rounded-full bg-rose-500 absolute right-0 -top-0.75"></div>
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Non-Stop</div>
                    </div>

                    {/* Arrival */}
                    <div className="sm:text-right">
                      <div className="text-xl font-black text-white">{t.arrivalTime || "04:00 AM"}</div>
                      <div className="text-xs font-bold text-emerald-400">{t.route?.destination || destination}</div>
                      <div className="text-[11px] text-slate-300">Drop: Central Junction</div>
                    </div>
                  </div>

                  {/* Pricing & Seat CTA Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[11px] text-slate-300 block">Starts from</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">₹{parseFloat(t.basePrice).toFixed(2)}</span>
                          {t.originalPrice && parseFloat(t.originalPrice) > parseFloat(t.basePrice) && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{parseFloat(t.originalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-rose-600 text-white border border-rose-500 text-xs font-black shadow-md">
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
                    <span className="text-white font-bold">{paginationMeta.totalPages}</span> ({paginationMeta.totalCount} Total Trips)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={paginationMeta.currentPage === 1}
                      onClick={() => fetchTripsFromBackend(source, destination, date, selectedType, sortBy, Math.max(paginationMeta.currentPage - 1, 1))}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 font-semibold hover:border-slate-500 transition-all cursor-pointer"
                    >
                      Previous
                    </button>

                    {Array.from({ length: paginationMeta.totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => fetchTripsFromBackend(source, destination, date, selectedType, sortBy, pageNum)}
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
                      onClick={() => fetchTripsFromBackend(source, destination, date, selectedType, sortBy, Math.min(paginationMeta.currentPage + 1, paginationMeta.totalPages))}
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

export default BusSearchResults;
