import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Ticket, Calendar, MapPin, Download, XCircle, Bus, CheckCircle2, Clock } from "lucide-react";

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings/my-bookings");
      setBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = async (pnr) => {
    try {
      const response = await api.get(`/tickets/${pnr}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RedBus-Ticket-${pnr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF ticket");
    }
  };

  const handleCancelTicket = async (pnr) => {
    if (!window.confirm(`Are you sure you want to cancel PNR: ${pnr}? 80% of paid amount will be refunded to your wallet.`)) return;

    try {
      const res = await api.post("/tickets/cancel", { pnr });
      setMsg(res.data.data.message);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel ticket");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-7 h-7 text-rose-500" /> My Bus Bookings
          </h1>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
            Manage your active, upcoming, and past RedBus trips
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-300 dark:border-white/10 space-y-4 relative overflow-hidden shadow-lg"
            >
              {/* Card Top Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white font-black shadow-lg shadow-rose-600/30">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest block">
                      PNR: {booking.pnr}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{booking.trip?.bus?.name || "Express Bus"}</h3>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wider border uppercase ${
                    booking.bookingStatus === "CONFIRMED"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50"
                  }`}
                >
                  ✓ {booking.bookingStatus}
                </span>
              </div>

              {/* Journey Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-100/90 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-300 dark:border-slate-800">
                <div>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider block mb-0.5 text-[11px]">Route</span>
                  <div className="font-black text-slate-900 dark:text-white text-base">
                    {booking.trip?.route?.source} → {booking.trip?.route?.destination}
                  </div>
                </div>

                <div>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider block mb-0.5 text-[11px]">Departure</span>
                  <div className="font-black text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-rose-500" /> {booking.trip?.departureDate} at {booking.trip?.departureTime}
                  </div>
                </div>

                <div>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider block mb-0.5 text-[11px]">Amount Paid</span>
                  <div className="font-black text-emerald-600 dark:text-emerald-400 text-base">₹{booking.finalAmountPaid}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">via {booking.paymentMethod || "Razorpay Gateway"}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Seats: <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">{booking.seatsBooked?.join(", ") || "Selected"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(booking.pnr)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download PDF Ticket
                  </button>

                  {booking.bookingStatus === "CONFIRMED" && (
                    <button
                      onClick={() => handleCancelTicket(booking.pnr)}
                      className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white text-xs font-black flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-card rounded-3xl border border-white/10 space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Tickets Booked Yet</h3>
          <p className="text-xs text-slate-400">Search for buses and start booking tickets on RedBus!</p>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
