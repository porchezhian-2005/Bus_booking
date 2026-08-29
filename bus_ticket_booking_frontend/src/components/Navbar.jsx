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
      {/* Eye Protection Overlay Filter (Active in both Day & Night modes) */}
      {eyeProtection && <div className="eye-protection-filter" />}

      <nav className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-b border-rose-500/20 px-4 md:px-8 py-3 shadow-lg shadow-rose-950/20">
        <div className="w-full flex items-center justify-between px-2 md:px-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-all">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                red<span className="text-rose-500">Bus</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">PRO</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Bus Tickets & Travel</span>
            </div>
          </Link>

          {/* Navigation Links & Display Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-sm font-medium">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive("/")
                  ? "bg-rose-500/15 text-rose-500 border border-rose-500/40 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Bus className="w-4 h-4 text-rose-500" />
              <span>Bus Tickets</span>
            </Link>

            {/* Display Mode Control Toolbar (Day/Night & Eye Protection) */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
              {/* Day / Night Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={themeMode === "night" ? "Switch to Day Mode (Light Theme)" : "Switch to Night Mode (Dark Theme)"}
                className={`p-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  themeMode === "day"
                    ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {themeMode === "day" ? (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden lg:inline text-[11px]">Night</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden lg:inline text-[11px]">Day</span>
                  </>
                )}
              </button>

              {/* Eye Protection Toggle (Common for both Day & Night modes) */}
              <button
                type="button"
                onClick={toggleEyeProtection}
                title={eyeProtection ? "Disable Eye Protection Filter" : "Enable Eye Protection Warm Filter (Reduces Blue Light)"}
                className={`p-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  eyeProtection
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {eyeProtection ? (
                  <>
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span className="hidden lg:inline text-[11px]">Eye Shield ON</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    <span className="hidden lg:inline text-[11px]">Eye Shield</span>
                  </>
                )}
              </button>
            </div>

            {token ? (
              <>
                {role === "admin" ? (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isActive("/admin")
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>Admin Panel</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/my-bookings"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive("/my-bookings")
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/40"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      <Ticket className="w-4 h-4 text-rose-400" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      to="/wallet"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive("/wallet")
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Wallet</span>
                    </Link>

                    <Link
                      to="/profile"
                      className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive("/profile")
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/40 shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      <User className="w-4 h-4 text-rose-500" />
                      <span>{user?.name || "Profile"}</span>
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    themeMode === "day"
                      ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 font-bold"
                      : "bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border-slate-700/60 hover:border-rose-500/40"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Link
                  to="/login"
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive("/login")
                      ? "bg-rose-600 text-white font-bold"
                      : themeMode === "day"
                      ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 shadow-sm"
                      : "text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/25 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
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
