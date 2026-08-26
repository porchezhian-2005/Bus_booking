import React, { useState } from "react";
import { X, Check, MapPin, Armchair, Bed, ShieldAlert } from "lucide-react";

export const SeatMapModal = ({ isOpen, onClose, seats, selectedSeats, onSelectSeat, trip }) => {
  const [activeDeckTab, setActiveDeckTab] = useState("LOWER"); // LOWER or UPPER
  const [boardingPoint, setBoardingPoint] = useState("Main Bus Terminal");
  const [droppingPoint, setDroppingPoint] = useState("Central Junction");

  if (!isOpen) return null;

  // Separate seats into sleeper upper, sleeper lower, and seater
  const lowerDeck = seats.filter((s) => s.seatType === "SLEEPER_LOWER" || s.seatType === "SEATER" || !s.seatType);
  const upperDeck = seats.filter((s) => s.seatType === "SLEEPER_UPPER");
  const hasUpperDeck = upperDeck.length > 0;

  const isSeatSelected = (seatId) => {
    return selectedSeats.some((s) => (typeof s === "object" ? s.id === seatId : s === seatId));
  };

  const getSeatColor = (seat) => {
    if (seat.status === "BOOKED") {
      return "bg-slate-800/80 border-slate-700 text-slate-500 cursor-not-allowed opacity-60";
    }
    if (isSeatSelected(seat.id)) {
      return "bg-gradient-to-br from-rose-600 to-red-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/50 scale-105";
    }
    if (seat.genderPolicy === "FEMALE_ONLY") {
      return "bg-pink-950/40 text-pink-300 border-pink-500/40 hover:bg-pink-900/50 cursor-pointer";
    }
    return "bg-slate-800/90 text-slate-200 border-slate-700 hover:border-rose-500/60 hover:bg-slate-800 cursor-pointer";
  };

  const displayedSeats = activeDeckTab === "UPPER" && hasUpperDeck ? upperDeck : lowerDeck;

  const totalFare = selectedSeats.reduce((sum, item) => {
    const s = typeof item === "object" ? item : seats.find((x) => x.id === item);
    return sum + (s ? parseFloat(s.price || 0) : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-lg">
      <div className="glass-card max-w-4xl w-full p-5 sm:p-7 border border-rose-500/30 rounded-3xl max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                Select Seats
              </span>
              <h2 className="text-xl font-extrabold text-white">{trip?.bus?.name || "Express Bus"}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {trip?.route?.source} → {trip?.route?.destination} | Departure: {trip?.departureTime || "21:30"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-all border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend Bar */}
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center bg-slate-950/50 p-3 rounded-2xl border border-white/5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 border border-slate-600"></div>
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-600 border border-rose-400"></div>
            <span className="text-rose-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800/80 border border-slate-700 opacity-60"></div>
            <span className="text-slate-500">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-pink-950/40 border border-pink-500/50"></div>
            <span className="text-pink-300">Ladies Seat</span>
          </div>
        </div>

        {/* Boarding & Dropping Points Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Boarding Point
            </label>
            <select
              value={boardingPoint}
              onChange={(e) => setBoardingPoint(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-rose-500"
            >
              <option value="Main Bus Terminal">Main Bus Terminal (21:30)</option>
              <option value="Koyambedu Hub">Koyambedu Hub (21:45)</option>
              <option value="T-Nagar Stop">T-Nagar Stop (22:00)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Dropping Point
            </label>
            <select
              value={droppingPoint}
              onChange={(e) => setDroppingPoint(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-rose-500"
            >
              <option value="Central Junction">Central Junction (04:00 AM)</option>
              <option value="Electronic City">Electronic City (04:15 AM)</option>
              <option value="Majestic Terminus">Majestic Terminus (04:30 AM)</option>
            </select>
          </div>
        </div>

        {/* Deck Selector Tabs (If Sleeper Bus) */}
        {hasUpperDeck && (
          <div className="flex justify-center border-b border-white/10 pb-2">
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex gap-1">
              <button
                onClick={() => setActiveDeckTab("LOWER")}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDeckTab === "LOWER"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Armchair className="w-4 h-4" /> Lower Deck
              </button>
              <button
                onClick={() => setActiveDeckTab("UPPER")}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDeckTab === "UPPER"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Bed className="w-4 h-4" /> Upper Deck
              </button>
            </div>
          </div>
        )}

        {/* Seat Graphic Canvas Container */}
        <div className="bg-slate-950/80 p-5 sm:p-6 rounded-3xl border border-white/10 relative">
          {/* Driver Steering Wheel Bar */}
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-dashed border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Front of Bus {hasUpperDeck ? `(${activeDeckTab} DECK)` : ""}
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center text-slate-600" title="Driver Wheel">
              <span className="text-[10px] font-black">⚙</span>
            </div>
          </div>

          {/* Seat Grid Layout */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
            {displayedSeats.map((seat) => {
              const isSleeper = seat.seatType?.includes("SLEEPER");
              return (
                <button
                  key={seat.id}
                  disabled={seat.status === "BOOKED"}
                  onClick={() => onSelectSeat(seat)}
                  className={`rounded-xl border p-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSleeper ? "sleeper-berth-h" : "w-14 h-14"
                  } ${getSeatColor(seat)}`}
                >
                  <span className="font-extrabold text-xs">{seat.seatNumber}</span>
                  <span className="text-[10px] font-semibold opacity-85">₹{seat.price}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Summary & Proceed */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-xs text-slate-400 font-bold">
              Selected Seats:{" "}
              <span className="font-black text-rose-500 dark:text-rose-400">
                {selectedSeats.length > 0
                  ? selectedSeats
                      .map((item) => (typeof item === "object" ? item.seatNumber : seats.find((s) => s.id === item)?.seatNumber))
                      .filter(Boolean)
                      .join(", ")
                  : "None"}
              </span>
            </div>
            <div className="text-xl font-black text-rose-400 mt-0.5">₹{totalFare.toFixed(2)}</div>
          </div>

          <button
            disabled={selectedSeats.length === 0}
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:from-slate-200 disabled:to-slate-200 disabled:bg-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:border disabled:border-slate-300 dark:disabled:border-slate-700 text-white font-black tracking-wide text-xs uppercase shadow-xl shadow-rose-600/30 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            CONFIRM & PROCEED
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatMapModal;
