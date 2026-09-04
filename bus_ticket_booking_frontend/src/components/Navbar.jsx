import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { logout } from "../features/auth/authSlice";
import { Bus, Wallet, User, LogOut, Ticket, LayoutDashboard, UserPlus, ShieldCheck, Sun, Moon, Eye, EyeOff } from "lucide-react";

export const Navbar = () => {
  const { token, role, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Theme & Eye Protection State
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("themeMode") || "night");
  const [eyeProtection, setEyeProtection] = useState(() => localStorage.getItem("eyeProtection") === "true");

  useEffect(() => {
    if (themeMode === "day") {
      document.body.classList.add("day-mode");
    } else {
      document.body.classList.remove("day-mode");
    }
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("eyeProtection", eyeProtection);
  }, [eyeProtection]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "night" ? "day" : "night"));
  };

  const toggleEyeProtection = () => {
    setEyeProtection((prev) => !prev);
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Eye Protection Overlay Filter */}
      {eyeProtection && <div className="eye-protection-filter" />}

      <nav className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl border-b border-rose-500/20 px-2 sm:px-6 md:px-8 py-2.5 shadow-lg shadow-rose-950/20 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 px-1 sm:px-4">
          {/* Brand Logo */}
          <Link to={String(role || "").toUpperCase() === "ADMIN" || String(role || "").toUpperCase() === "SUPER_ADMIN" ? "/admin" : "/"} className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-all">
              <Bus className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1">
                red<span className="text-rose-500">Bus</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-1 sm:px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">PRO</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">Bus Tickets & Travel</span>
            </div>
          </Link>

          {/* Navigation Links & Display Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-medium flex-shrink-0">
            {!(String(role || localStorage.getItem("userRole") || "").toUpperCase() === "ADMIN" || String(role || localStorage.getItem("userRole") || "").toUpperCase() === "SUPER_ADMIN") && (
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive("/")
                    ? "bg-rose-500/15 text-rose-500 border border-rose-500/40 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
                title="Bus Tickets"
              >
                <Bus className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Bus Tickets</span>
              </Link>
            )}

            {/* Display Mode Control Toolbar */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={toggleTheme}
                title={themeMode === "night" ? "Switch to Day Mode" : "Switch to Night Mode"}
                className={`p-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  themeMode === "day"
                    ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {themeMode === "day" ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span className="hidden lg:inline text-[11px]">{themeMode === "day" ? "Night" : "Day"}</span>
              </button>

              <button
                type="button"
                onClick={toggleEyeProtection}
                title={eyeProtection ? "Disable Eye Protection" : "Enable Eye Protection Warm Filter"}
                className={`p-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  eyeProtection
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {eyeProtection ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                <span className="hidden lg:inline text-[11px]">Eye Shield</span>
              </button>
            </div>

            {token ? (
              <>
                {String(role || "").toUpperCase() === "ADMIN" || String(role || "").toUpperCase() === "SUPER_ADMIN" ? (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isActive("/admin")
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                    title="Admin Panel"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/my-bookings"
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive("/my-bookings")
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/40"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                      }`}
                      title="My Bookings"
                    >
                      <Ticket className="w-4 h-4 text-rose-400" />
                      <span className="hidden md:inline">My Bookings</span>
                    </Link>

                    <Link
                      to="/wallet"
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive("/wallet")
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                      }`}
                      title="Wallet"
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span className="hidden md:inline">Wallet</span>
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    themeMode === "day"
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                      : "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                  }`}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/30 transition-all"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
