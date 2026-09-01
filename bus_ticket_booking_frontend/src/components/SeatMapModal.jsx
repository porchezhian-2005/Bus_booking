import React, { useState } from "react";
import { X, Check, MapPin, Armchair, Bed, User, ShieldAlert, Sparkles } from "lucide-react";

export const SeatMapModal = ({ isOpen, onClose, seats = [], selectedSeats = [], onSelectSeat, trip }) => {
  const [activeDeckTab, setActiveDeckTab] = useState("LOWER"); // LOWER or UPPER
  const [boardingPoint, setBoardingPoint] = useState("");
  const [droppingPoint, setDroppingPoint] = useState("");

  if (!isOpen) return null;

  // Separate seats into sleeper upper, sleeper lower, and seater
  const lowerDeck = seats.filter((s) => s.seatType === "SLEEPER_LOWER" || s.seatType === "SEATER" || !s.seatType);
  const upperDeck = seats.filter((s) => s.seatType === "SLEEPER_UPPER");
  const hasUpperDeck = upperDeck.length > 0;

  const isSeatSelected = (seatId) => {
    return selectedSeats.some((s) => (typeof s === "object" ? s.id === seatId : s === seatId));
  };

  const currentDeckSeats = activeDeckTab === "UPPER" && hasUpperDeck ? upperDeck : lowerDeck;

  // Helper to extract numerical seat index for layout sorting
  const sortSeats = (seatList) => {
    return [...seatList].sort((a, b) => {
      const numA = parseInt(String(a.seatNumber).replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.seatNumber).replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  };

  const sortedSeats = sortSeats(currentDeckSeats);

  // Group seats into 2+1 rows (3 seats per row)
  const rows = [];
  for (let i = 0; i < sortedSeats.length; i += 3) {
    rows.push(sortedSeats.slice(i, i + 3));
  }

  const getSeatStyling = (seat) => {
    const isBooked = seat.status === "BOOKED";
    const isHeldByOther = seat.status === "HELD" && !seat.isHeldByMe;
    const isSelected = isSeatSelected(seat.id);
    const isLadies = seat.isLadiesSeat || seat.isLadies || seat.genderPolicy === "FEMALE_ONLY";

    if (isBooked) {
      return "bg-slate-800/60 dark:bg-slate-900/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-50 select-none";
    }

    if (isHeldByOther) {
      return "bg-amber-950/40 text-amber-400/80 border-amber-500/40 cursor-not-allowed opacity-70 select-none";
    }

    if (isSelected) {
      if (isLadies) {
        return "bg-gradient-to-br from-rose-600 via-pink-600 to-red-600 text-white border-pink-300 shadow-lg shadow-rose-600/40 ring-2 ring-pink-400 scale-105 cursor-pointer font-bold";
      }
      return "bg-gradient-to-br from-rose-600 to-red-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/50 scale-105 cursor-pointer font-bold";
    }

    if (isLadies) {
      return "bg-pink-950/40 text-pink-300 border-pink-500/60 hover:border-pink-400 hover:bg-pink-900/60 cursor-pointer shadow-sm shadow-pink-950/20";
    }

    return "bg-slate-800/90 text-slate-100 border-slate-700 hover:border-rose-500/60 hover:bg-slate-800 cursor-pointer";
  };

  const selectedSeatObjects = selectedSeats.map((item) =>
    typeof item === "object" ? item : seats.find((s) => s.id === item)
  ).filter(Boolean);

  const totalFare = selectedSeatObjects.reduce((sum, s) => sum + parseFloat(s.price || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-4xl w-full p-5 sm:p-7 border border-rose-500/30 rounded-3xl max-h-[94vh] flex flex-col justify-between space-y-5 shadow-2xl overflow-y-auto">
        {/* Header Bar */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                Seat Selection
              </span>
              <h2 className="text-xl font-extrabold text-white">{trip?.bus?.name || "Express Bus"}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {trip?.route ? `${trip.route.source} → ${trip.route.destination}` : "Route"} | Date: {trip?.departureDate} at {trip?.departureTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-all border border-slate-700 cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Boarding & Dropping Points Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Boarding Point
            </label>
            <select
              value={boardingPoint}
              onChange={(e) => setBoardingPoint(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="" disabled>Select boarding point</option>
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
              className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="" disabled>Select dropping point</option>
              <option value="Central Junction">Central Junction (04:00 AM)</option>
              <option value="Electronic City">Electronic City (04:15 AM)</option>
              <option value="Majestic Terminus">Majestic Terminus (04:30 AM)</option>
            </select>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center bg-slate-950/40 p-3 rounded-2xl border border-white/5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 border border-slate-600"></div>
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-rose-600 to-red-600 border border-rose-400"></div>
            <span className="text-rose-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-900 border border-slate-700 opacity-60"></div>
            <span className="text-slate-500">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-pink-950/60 border border-pink-500/60 flex items-center justify-center text-[10px] text-pink-300 font-bold">♀</div>
            <span className="text-pink-300">Ladies Seat</span>
          </div>
        </div>

        {/* Deck Selector Tabs (If Sleeper Bus) */}
        {hasUpperDeck && (
          <div className="flex justify-center">
            <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveDeckTab("LOWER")}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDeckTab === "LOWER"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Armchair className="w-4 h-4" /> Lower Deck
              </button>
              <button
                type="button"
                onClick={() => setActiveDeckTab("UPPER")}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDeckTab === "UPPER"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Bed className="w-4 h-4" /> Upper Deck
              </button>
            </div>
          </div>
        )}

        {/* Real Bus Graphic Canvas (2+1 Layout Structure) */}
        <div className="bg-slate-950/80 p-5 sm:p-6 rounded-3xl border border-white/10 relative shadow-2xl">
          {/* Driver Steering Wheel Divider Header */}
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-dashed border-slate-800">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>FRONT OF BUS {hasUpperDeck ? `(${activeDeckTab} DECK)` : ""}</span>
            </div>
            <div className="w-9 h-9 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 shadow-md" title="Driver Wheel Cabin">
              <span className="text-xs font-black">⚙</span>
            </div>
          </div>

          {/* 2+1 Layout Grid Rows */}
          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
            {rows.map((rowSeats, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between gap-4 sm:gap-8 bg-slate-900/30 p-2 rounded-2xl border border-white/5">
                {/* Left Side (2 Seats/Berths) */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-start">
                  {rowSeats.slice(0, 2).map((seat) => {
                    const isSleeper = seat.seatType?.includes("SLEEPER");
                    const isLadies = seat.isLadiesSeat || seat.isLadies || seat.genderPolicy === "FEMALE_ONLY";
                    const isSelected = isSeatSelected(seat.id);

                    return (
                      <button
                        key={seat.id}
                        disabled={seat.status === "BOOKED" || (seat.status === "HELD" && !seat.isHeldByMe)}
                        onClick={() => onSelectSeat(seat)}
                        className={`rounded-xl border p-2 text-center transition-all flex flex-col items-center justify-center relative ${
                          isSleeper ? "w-24 sm:w-28 h-12" : "w-14 sm:w-16 h-14"
                        } ${getSeatStyling(seat)}`}
                      >
                        {isLadies && (
                          <span className="absolute top-1 right-1 text-[9px] font-black text-pink-300">♀</span>
                        )}
                        <span className="font-black text-xs tracking-wider flex items-center gap-1">
                          {seat.seatNumber}
                          {isSelected && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                        </span>
                        <span className="text-[10px] font-bold opacity-90">₹{seat.price}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Aisle Walkway Space Indicator */}
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden sm:block select-none opacity-50 px-2">
                  AISLE
                </div>

                {/* Right Side (1 Seat/Berth) */}
                <div className="flex items-center justify-end">
                  {rowSeats.slice(2, 3).map((seat) => {
                    const isSleeper = seat.seatType?.includes("SLEEPER");
                    const isLadies = seat.isLadiesSeat || seat.isLadies || seat.genderPolicy === "FEMALE_ONLY";
                    const isSelected = isSeatSelected(seat.id);

                    return (
                      <button
                        key={seat.id}
                        disabled={seat.status === "BOOKED" || (seat.status === "HELD" && !seat.isHeldByMe)}
                        onClick={() => onSelectSeat(seat)}
                        className={`rounded-xl border p-2 text-center transition-all flex flex-col items-center justify-center relative ${
                          isSleeper ? "w-24 sm:w-28 h-12" : "w-14 sm:w-16 h-14"
                        } ${getSeatStyling(seat)}`}
                      >
                        {isLadies && (
                          <span className="absolute top-1 right-1 text-[9px] font-black text-pink-300">♀</span>
                        )}
                        <span className="font-black text-xs tracking-wider flex items-center gap-1">
                          {seat.seatNumber}
                          {isSelected && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                        </span>
                        <span className="text-[10px] font-bold opacity-90">₹{seat.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Summary & Action Proceed */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-200 dark:border-white/10">
          <div>
            <div className="text-xs text-slate-400 font-bold">
              Selected Seats ({selectedSeatObjects.length}):{" "}
              <span className="font-black text-rose-500 dark:text-rose-400">
                {selectedSeatObjects.length > 0
                  ? selectedSeatObjects.map((s) => s.seatNumber).join(", ")
                  : "None Selected"}
              </span>
            </div>
            <div className="text-2xl font-black text-rose-400 tracking-tight mt-0.5">
              ₹{totalFare.toFixed(2)}
            </div>
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

