import React from "react";
import { useLocation, Link } from "react-router";
import bookingApi from "../services/bookingApi";
import { CheckCircle2, Download, Ticket, ArrowRight, Printer, Bus, MapPin, Calendar, Clock, User, QrCode } from "lucide-react";

export const BookingConfirmation = () => {
  const location = useLocation();
  const { booking } = location.state || {};

  if (!booking) {
    return (
      <div className="max-w-md mx-auto my-16 text-center text-slate-400 glass-card p-8 rounded-3xl border border-rose-500/20">
        <Ticket className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">No Booking Found</h3>
        <p className="text-xs mb-4">You have not recently completed a booking session.</p>
        <Link to="/" className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await bookingApi.downloadPdfTicket(booking.pnr);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RedBus-Ticket-${booking.pnr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF ticket");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2 no-print">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Booking Confirmed!</h1>
        <p className="text-xs text-slate-400">Your official RedBus e-ticket has been generated.</p>
      </div>

      {/* RedBus Ticket Card Container */}
      <div className="glass-card rounded-3xl border border-rose-500/30 overflow-hidden shadow-2xl bg-slate-900/90 text-slate-100">
        {/* Ticket Header Bar */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 p-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight">redBus E-TICKET</span>
              <p className="text-[10px] opacity-90">Confirmed Bus Ticket</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-200 block">PNR NUMBER</span>
            <span className="text-xl font-black tracking-wider bg-white/20 px-3 py-1 rounded-lg inline-block mt-0.5">
              {booking.pnr}
            </span>
          </div>
        </div>

        {/* Ticket Body Content */}
        <div className="p-6 space-y-6">
          {/* Operator & Route info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">Bus Operator</div>
              <div className="text-lg font-extrabold text-white">{booking.trip?.bus?.name || "Fleet Bus"}</div>
              <div className="text-xs text-slate-400">{booking.trip?.bus?.busType || "AC Bus"}</div>
            </div>

            {/* Simulated QR Code Graphic */}
            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <div className="w-14 h-14 bg-white p-1 rounded-lg flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-900" />
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Scan for Boarding <br />
                <span className="text-white font-bold">Verified Ticket</span>
              </div>
            </div>
          </div>

          {/* Departure & Arrival Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Departure</span>
              <div className="text-xl font-black text-white">{booking.trip?.departureTime || ""}</div>
              <div className="text-xs font-bold text-rose-400">{booking.trip?.route?.source || "Source City"}</div>
              <div className="text-[11px] text-slate-400 mt-1">Main Bus Stand</div>
            </div>

            <div className="text-center py-2 sm:py-0">
              <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-rose-400" /> Date: {booking.trip?.departureDate}
              </div>
              <div className="w-full h-0.5 bg-gradient-to-r from-rose-500 via-slate-600 to-rose-500 my-1 relative">
                <div className="w-2 h-2 rounded-full bg-rose-500 absolute left-0 -top-0.75"></div>
                <div className="w-2 h-2 rounded-full bg-rose-500 absolute right-0 -top-0.75"></div>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Status: CONFIRMED</span>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Arrival</span>
              <div className="text-xl font-black text-white">04:00 AM</div>
              <div className="text-xs font-bold text-emerald-400">{booking.trip?.route?.destination || "Bengaluru"}</div>
              <div className="text-[11px] text-slate-400 mt-1">Central Junction</div>
            </div>
          </div>

          {/* Passenger & Fare Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2">
              <div className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Passengers & Seats
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seat Numbers:</span>
                <span className="font-extrabold text-white">{booking.seatsBooked?.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Passengers:</span>
                <span className="font-bold text-white">{booking.seatsBooked?.length || 1} Person(s)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2">
              <div className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" /> Payment Breakdown
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode:</span>
                <span className="font-bold text-white">{booking.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Fare Paid:</span>
                <span className="font-black text-emerald-400 text-sm">₹{booking.finalAmountPaid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-slate-950 p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-400" /> Print Ticket
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF Ticket
            </button>
            <Link
              to="/my-bookings"
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1"
            >
              My Bookings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
