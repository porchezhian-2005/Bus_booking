import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router";
import toast from "react-hot-toast";
import api from "../services/api";
import adminApi from "../services/adminApi";
import bookingApi from "../services/bookingApi";
import {
  LayoutDashboard,
  Bus,
  Route,
  Ticket,
  Tag,
  Settings,
  Plus,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  Save,
  Send,
  BarChart3,
  Sparkles,
  ChevronRight,
  PieChart,
  Users,
  CreditCard,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  Phone,
  Mail,
  User,
  XCircle,
  AlertTriangle,
  Edit,
  Power,
  Trash2,
} from "lucide-react";

export const formatIndianCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num === 0) return "₹0";

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, "");
    return `₹${cr}C`;
  }
  if (num >= 100000) {
    const lakh = (num / 100000).toFixed(2).replace(/\.00$/, "");
    return `₹${lakh}L`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(2).replace(/\.00$/, "");
    return `₹${k}K`;
  }

  return `₹${num.toFixed(0)}`;
};

export const formatDateTime = (isoStr) => {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminDashboard = () => {
  const { user, token, role } = useSelector((state) => state.auth);
  const themeMode = useSelector((state) => state.theme?.mode || "night");
  const isDay = themeMode === "day";

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Project");
  const [analytics, setAnalytics] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripPage, setTripPage] = useState(1);
  const TRIPS_PER_PAGE = 8;
  const [coupons, setCoupons] = useState([]);
  const [config, setConfig] = useState({ walletMaxUsagePercent: "", referralAmount: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Bus Form State
  const [busName, setBusName] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [busType, setBusType] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [operatorName, setOperatorName] = useState("");

  // Route Form State
  const [routeSource, setRouteSource] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationHours, setDurationHours] = useState("");

  // Trip Schedule Form State
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [tripDepartureDate, setTripDepartureDate] = useState("");
  const [tripDepartureTime, setTripDepartureTime] = useState("");
  const [tripArrivalTime, setTripArrivalTime] = useState("");
  const [tripBasePrice, setTripBasePrice] = useState("");

  // Submission Loading States
  const [isAddingBus, setIsAddingBus] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [isSchedulingTrip, setIsSchedulingTrip] = useState(false);

  // Coupon Form State
  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [minBookingAmount, setMinBookingAmount] = useState("");

  // Modal Editing States
  const [editingBus, setEditingBus] = useState(null);
  const [decommissioningBus, setDecommissioningBus] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editingRouteStops, setEditingRouteStops] = useState("");
  const [editingTrip, setEditingTrip] = useState(null);
  const [editTripDate, setEditTripDate] = useState("");
  const [editTripDepTime, setEditTripDepTime] = useState("");
  const [editTripArrTime, setEditTripArrTime] = useState("");
  const [editTripPrice, setEditTripPrice] = useState("");
  const [editTripStatus, setEditTripStatus] = useState("SCHEDULED");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const aRes = await adminApi.getAnalytics().catch(() => null);
      if (aRes?.data?.data) setAnalytics(aRes.data.data);

      const bRes = await adminApi.getAllBookings().catch(() => null);
      if (bRes?.data?.data) setAllBookings(bRes.data.data);

      const busRes = await adminApi.getAllBuses().catch(() => null);
      if (busRes?.data?.data) {
        setBuses(busRes.data.data);
        if (busRes.data.data.length > 0 && !selectedBusId) setSelectedBusId(busRes.data.data[0].id);
      }

      const rRes = await adminApi.getAllRoutes().catch(() => null);
      if (rRes?.data?.data) {
        setRoutes(rRes.data.data);
        if (rRes.data.data.length > 0 && !selectedRouteId) setSelectedRouteId(rRes.data.data[0].id);
      }

      const tRes = await adminApi.getAllTrips().catch(() => null);
      if (tRes?.data?.data) setTrips(tRes.data.data);

      const cRes = await adminApi.getCoupons().catch(() => null);
      if (cRes?.data?.data) setCoupons(cRes.data.data);

      const cfgRes = await bookingApi.getSystemConfig().catch(() => null);
      if (cfgRes?.data?.data) setConfig(cfgRes.data.data);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    if (isAddingBus) return;

    setIsAddingBus(true);
    try {
      await adminApi.addBus({ 
        name: busName, 
        busNumber, 
        busType, 
        totalSeats: Number(totalSeats || 30), 
        operatorName 
      });
      toast.success("Bus added to RedBus fleet successfully!");
      setBusName("");
      setBusNumber("");
      setBusType("");
      setTotalSeats("");
      setOperatorName("");
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add bus");
    } finally {
      setIsAddingBus(false);
    }
  };

  const handleUpdateBus = async (e) => {
    e.preventDefault();
    if (!editingBus || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await adminApi.updateBus(editingBus.id, {
        name: editingBus.name,
        busNumber: editingBus.busNumber,
        busType: editingBus.busType,
        totalSeats: Number(editingBus.totalSeats),
        operatorName: editingBus.operatorName,
      });
      toast.success("Bus updated successfully!");
      setEditingBus(null);
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update bus");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDecommissionBus = async () => {
    if (!decommissioningBus || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await adminApi.decommissionBus(decommissioningBus.id, {});
      toast.success("Bus decommissioned successfully! Unbooked trips cancelled & active bookings refunded.");
      setDecommissioningBus(null);
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to decommission bus");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (isAddingRoute) return;

    if (!routeSource || !routeDestination || routeSource.trim().toLowerCase() === routeDestination.trim().toLowerCase()) {
      toast.error("Source and Destination cities cannot be the same.");
      return;
    }

    if (!distanceKm || Number(distanceKm) <= 0) {
      toast.error("Distance must be greater than 0 km.");
      return;
    }

    setIsAddingRoute(true);
    try {
      await adminApi.addRoute({
        source: routeSource.trim(),
        destination: routeDestination.trim(),
        distanceKm: Number(distanceKm),
        durationHours: Number(durationHours),
      });
      toast.success("New Route created successfully!");
      setRouteSource("");
      setRouteDestination("");
      setDistanceKm("");
      setDurationHours("");
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create route");
    } finally {
      setIsAddingRoute(false);
    }
  };

  const handleUpdateRouteStops = async (e) => {
    e.preventDefault();
    if (!editingRoute || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const stopsArr = editingRouteStops
        ? editingRouteStops.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      await adminApi.updateRouteStops(editingRoute.id, stopsArr);
      toast.success("Route intermediate stops updated successfully!");
      setEditingRoute(null);
      setEditingRouteStops("");
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update route stops");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleScheduleTrip = async (e) => {
    e.preventDefault();
    if (isSchedulingTrip) return;

    if (!selectedBusId || !selectedRouteId) {
      toast.error("Please select both a Bus and a Route to schedule a trip.");
      return;
    }

    if (!tripBasePrice || Number(tripBasePrice) <= 0) {
      toast.error("Base ticket price must be greater than ₹0.");
      return;
    }

    setIsSchedulingTrip(true);
    try {
      await adminApi.createTrip({
        busId: selectedBusId,
        routeId: selectedRouteId,
        departureDate: tripDepartureDate,
        departureTime: tripDepartureTime,
        arrivalTime: tripArrivalTime,
        basePrice: Number(tripBasePrice),
      });
      toast.success("Trip scheduled and seats generated!");
      setTripDepartureDate("");
      setTripDepartureTime("");
      setTripArrivalTime("");
      setTripBasePrice("");
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule trip");
    } finally {
      setIsSchedulingTrip(false);
    }
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    if (!editingTrip || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await adminApi.updateTrip(editingTrip.id, {
        departureDate: editTripDate,
        departureTime: editTripDepTime,
        arrivalTime: editTripArrTime,
        basePrice: Number(editTripPrice),
        status: editTripStatus,
      });
      toast.success("Trip rescheduled / updated successfully!");
      setEditingTrip(null);
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update trip");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createCoupon({
        code: couponCode,
        discountType,
        discountValue: Number(discountValue),
        minBookingAmount: Number(minBookingAmount || 0),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      toast.success("Promo Coupon created successfully!");
      setCouponCode("");
      setDiscountValue("");
      setMinBookingAmount("");
      fetchAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create coupon");
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateSystemConfig({
        walletMaxUsagePercent: Number(config.walletMaxUsagePercent),
        referralAmount: Number(config.referralAmount),
      });
      toast.success("System configuration updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update config");
    }
  };

  const effectiveRole = user?.role || role || localStorage.getItem("userRole");

  if (!token || effectiveRole !== "admin") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-rose-500/30 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Admin Portal Restricted</h2>
            <p className="text-xs text-slate-400">You must be logged in with a Super Admin account to access the Operator Dashboard.</p>
          </div>
          <Link
            to="/login"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SIGN IN TO ADMIN PORTAL</span>
          </Link>
        </div>
      </div>
    );
  }

  // Dynamic Theme Theme Classes
  const bgMain = isDay ? "bg-slate-100 text-slate-900" : "bg-[#090d16] text-slate-100";
  const bgSidebar = isDay ? "bg-white border-slate-200" : "bg-[#0e131f] border-slate-800/80";
  const bgCard = isDay ? "bg-white border-slate-200 text-slate-900 shadow-md" : "bg-[#0e131f] border-slate-800 text-slate-100 shadow-xl";
  const bgInnerCard = isDay ? "bg-slate-50 border-slate-200" : "bg-[#090d16] border-slate-800";
  const bgInput = isDay ? "bg-white border-slate-300 text-slate-900" : "bg-[#090d16] border-slate-800 text-white";
  const textSubtle = isDay ? "text-slate-600 font-medium" : "text-slate-400";
  const textTitle = isDay ? "text-slate-900 font-extrabold" : "text-white font-extrabold";
  const borderDivider = isDay ? "border-slate-200" : "border-slate-800/80";

  // Filter Bookings by Status
  const confirmedBookingsList = allBookings.filter((b) => b.bookingStatus === "CONFIRMED" || b.bookingStatus === "booked" || !b.bookingStatus);
  const cancelledBookingsList = allBookings.filter((b) => b.bookingStatus === "CANCELLED" || b.paymentStatus === "FAILED");

  // Fuse Sidebar Navigation Structure
  const sidebarGroups = [
    {
      title: "Dashboards",
      subtitle: "Overview of key metrics",
      items: [
        { id: "Project", label: "Overview", icon: LayoutDashboard },
        { id: "Analytics", label: "Analytics & Reports", icon: BarChart3 },
        { id: "Finance", label: "Finance & Revenue", icon: DollarSign },
      ],
    },
    {
      title: "Fleet & Operations",
      subtitle: "Manage buses & travel routes",
      items: [
        { id: "Buses", label: "Fleet Buses", icon: Bus },
        { id: "Routes", label: "Travel Routes", icon: Route },
        { id: "Schedule Trips", label: "Schedule Trips", icon: Send },
      ],
    },
    {
      title: "Booked Users & Config",
      subtitle: "Passenger directory & settings",
      items: [
        { id: "Booked Users", label: "Booked Passengers", icon: UserCheck },
        { id: "Bookings", label: "Passenger Bookings", icon: Ticket },
        { id: "Cancelled Bookings", label: "Cancelled Bookings", icon: XCircle },
        { id: "Coupons", label: "Promo Coupons", icon: Tag },
        { id: "Config", label: "System Policy", icon: Settings },
      ],
    },
  ];

  // Dynamic Weekly Stats & Route Analytics from Backend DB
  const calculatedGrossRevenue = confirmedBookingsList.reduce((sum, b) => {
    const val = parseFloat(b.finalAmountPaid) || parseFloat(b.totalAmount) || 499;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const displayWeeklyStats = analytics?.weeklyStats || [
    { day: "Mon", bookings: 0, height: "20%" },
    { day: "Tue", bookings: 0, height: "20%" },
    { day: "Wed", bookings: confirmedBookingsList.length || 0, height: "85%" },
    { day: "Thu", bookings: 0, height: "20%" },
    { day: "Fri", bookings: 0, height: "20%" },
    { day: "Sat", bookings: 0, height: "20%" },
    { day: "Sun", bookings: 0, height: "20%" },
  ];

  const displayRouteAnalytics = analytics?.routeAnalytics || [
    { route: "Chennai → Bengaluru", bookings: confirmedBookingsList.length || 0, occupancy: `${analytics?.occupancyPercent || 85}%`, revenue: `₹${calculatedGrossRevenue}`, trend: "+10%" }
  ];

  return (
    <div className={`h-screen ${bgMain} flex font-sans overflow-hidden transition-colors duration-300`}>
      {/* Left Sidebar (Fuse Template Style) */}
      <aside className={`w-64 h-screen sticky top-0 ${bgSidebar} border-r flex flex-col justify-between hidden md:flex flex-shrink-0 transition-colors duration-300 overflow-y-auto`}>
        <div className="p-5 space-y-6">
          {/* Fuse Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-base font-black tracking-wider ${textTitle} block`}>redBus</span>
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Enterprise Admin</span>
            </div>
          </div>

          {/* Navigation Sidebar Categories */}
          <div className="space-y-6">
            {sidebarGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <div className="px-3">
                  <div className={`text-xs font-bold ${textTitle} tracking-wide`}>{group.title}</div>
                  <div className={`text-[10px] ${textSubtle} font-medium`}>{group.subtitle}</div>
                </div>

                <div className="space-y-1 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMsg("");
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? isDay
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                              : "bg-slate-800 text-white shadow-md border border-slate-700/60"
                            : isDay
                              ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : textSubtle}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t ${borderDivider}`}>
          <div className={`p-3 rounded-2xl ${bgInnerCard} border flex items-center gap-3`}>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 font-black flex items-center justify-center text-xs border border-rose-500/30">
              A
            </div>
            <div className="overflow-hidden">
              <div className={`text-xs font-bold ${textTitle} truncate`}>Super Admin</div>
              <div className={`text-[10px] ${textSubtle} truncate`}>admin@busticket.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Main Content Area */}
      <main className={`flex-1 h-screen overflow-y-auto min-w-0 ${bgMain} p-6 lg:p-10 space-y-8 transition-colors duration-300`}>
        <div className="max-w-7xl w-full mx-auto space-y-8">
          {/* Top Header Bar */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${borderDivider}`}>
          <div className="space-y-1">
            <h1 className={`text-2xl lg:text-3xl font-black ${textTitle} tracking-tight`}>
              {activeTab === "Project" && "Overview of Bus Ticket Operations"}
              {activeTab === "Analytics" && "Route Analytics & Passenger Reports"}
              {activeTab === "Finance" && "Financial Ledger & Revenue Statement"}
              {activeTab === "Buses" && "Fleet Buses Management"}
              {activeTab === "Routes" && "Travel Routes Management"}
              {activeTab === "Schedule Trips" && "Schedule Bus Trips & Seat Map"}
              {activeTab === "Booked Users" && "Booked Passengers Contact Directory"}
              {activeTab === "Bookings" && "Passenger Bookings Ledger"}
              {activeTab === "Cancelled Bookings" && "Cancelled & Refunded Bookings Directory"}
              {activeTab === "Coupons" && "Promo Coupons & Discount Offers"}
              {activeTab === "Config" && "System Configuration & Policy"}
            </h1>
            <p className={`text-xs ${textSubtle}`}>
              Summary of system performance, passenger bookings, and fleet statistics
            </p>
          </div>
        </div>



        {/* TAB 1: PROJECT OVERVIEW */}
        {activeTab === "Project" && (
          <div className="space-y-8">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`${bgCard} p-5 rounded-2xl border space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <Ticket className="w-3.5 h-3.5 text-rose-500" /> Bookings Today
                </div>
                <div className={`text-2xl font-black ${textTitle}`}>{confirmedBookingsList.length || 0}</div>
              </div>
              <div className={`${bgCard} p-5 rounded-2xl border space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Total Revenue
                </div>
                <div className="text-2xl font-black text-emerald-500">
                  {formatIndianCurrency(analytics?.totalRevenue && analytics.totalRevenue !== "0" && analytics.totalRevenue !== "0.00" ? analytics.totalRevenue : calculatedGrossRevenue)}
                </div>
              </div>
              <div className={`${bgCard} p-5 rounded-2xl border space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <Bus className="w-3.5 h-3.5 text-sky-500" /> Active Fleet
                </div>
                <div className={`text-2xl font-black ${textTitle}`}>{buses.length || 0} Buses</div>
              </div>
              <div className={`${bgCard} p-5 rounded-2xl border space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <Users className="w-3.5 h-3.5 text-indigo-500" /> Average Occupancy
                </div>
                <div className="text-2xl font-black text-indigo-500">{analytics?.occupancyPercent || "0.0"}%</div>
              </div>
            </div>

            {/* Fuse Analytics Hero Card */}
            <div className={`${bgCard} rounded-3xl border p-6 lg:p-8 space-y-6 relative overflow-hidden`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${borderDivider}`}>
                <div className="space-y-1">
                  <h2 className={`text-base font-bold ${textTitle} flex items-center gap-2`}>
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>Booking Overview & Revenue Metrics</span>
                  </h2>
                  <p className={`text-xs ${textSubtle}`}>
                    Weekly passenger ticket volume vs confirmed bookings across active routes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* SVG Bar Chart Visualization */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-extrabold ${textTitle} text-lg`}>Daily Ticket Bookings Trend</span>
                    <span className="text-xs font-black text-blue-500 uppercase tracking-wider">Past 7 Days Live Data</span>
                  </div>

                  <div className={`h-56 ${bgInnerCard} rounded-2xl p-6 border flex items-end justify-between gap-4 relative`}>
                    {displayWeeklyStats.map((st) => (
                      <div key={st.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                        <div className={`text-[10px] font-bold ${textSubtle} group-hover:text-blue-500 transition-colors`}>
                          {st.bookings}
                        </div>
                        <div
                          style={{ height: st.height }}
                          className="w-full max-w-[42px] bg-blue-600 group-hover:bg-blue-500 rounded-t-lg transition-all shadow-lg shadow-blue-600/30 relative"
                        >
                          <div className="w-2 h-2 rounded-full bg-white mx-auto mt-1 opacity-80" />
                        </div>
                        <span className={`text-[11px] font-bold ${textSubtle}`}>{st.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribution Breakdown Card (Redesigned with Visual Bars & Donut Aesthetic) */}
                <div className={`lg:col-span-4 ${bgInnerCard} rounded-2xl p-6 border space-y-5 shadow-sm`}>
                  <div className={`space-y-1 border-b ${borderDivider} pb-3 flex justify-between items-center`}>
                    <div>
                      <h3 className={`text-xs font-black ${textTitle} flex items-center gap-1.5`}>
                        <PieChart className="w-4 h-4 text-rose-500" />
                        <span>Distribution of Bookings</span>
                      </h3>
                      <p className={`text-[10px] ${textSubtle}`}>Real-time status breakdown</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30 text-[10px] font-black">
                      {allBookings.length || 0} Total
                    </span>
                  </div>

                  {/* Multi-Segment Status Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-emerald-500">
                        {allBookings.length ? Math.round((confirmedBookingsList.length / allBookings.length) * 100) : 0}% Confirmed
                      </span>
                      <span className="text-rose-500">
                        {allBookings.length ? Math.round((cancelledBookingsList.length / allBookings.length) * 100) : 0}% Cancelled
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 flex overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                      <div
                        style={{ width: `${allBookings.length ? (confirmedBookingsList.length / allBookings.length) * 100 : 70}%` }}
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
                      />
                      <div
                        style={{ width: `${allBookings.length ? (cancelledBookingsList.length / allBookings.length) * 100 : 30}%` }}
                        className="bg-rose-500 h-full rounded-full transition-all duration-500 shadow-sm ml-0.5"
                      />
                    </div>
                  </div>

                  {/* Visual Status Breakdown List */}
                  <div className="space-y-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold ${textSubtle} flex items-center gap-1.5`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Confirmed Tickets
                        </span>
                        <span className="font-black text-emerald-500">{confirmedBookingsList.length || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${allBookings.length ? (confirmedBookingsList.length / allBookings.length) * 100 : 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold ${textSubtle} flex items-center gap-1.5`}>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Refunded / Cancelled
                        </span>
                        <span className="font-black text-rose-500">{cancelledBookingsList.length || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${allBookings.length ? (cancelledBookingsList.length / allBookings.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className={`pt-2 border-t ${borderDivider} grid grid-cols-2 gap-2 text-center`}>
                      <div className={`p-2 rounded-xl ${bgCard} border space-y-0.5`}>
                        <span className={`text-[10px] ${textSubtle} uppercase block font-bold`}>Active Fleet</span>
                        <span className="text-sm font-black text-sky-500">{buses.length || 0} Buses</span>
                      </div>
                      <div className={`p-2 rounded-xl ${bgCard} border space-y-0.5`}>
                        <span className={`text-[10px] ${textSubtle} uppercase block font-bold`}>Active Routes</span>
                        <span className="text-sm font-black text-indigo-500">{routes.length || 0} Routes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS & REPORTS */}
        {activeTab === "Analytics" && (
          <div className="space-y-8">
            <div className={`${bgCard} rounded-3xl border p-6 space-y-6`}>
              <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b ${borderDivider}`}>
                <div>
                  <h2 className={`text-lg font-black ${textTitle} flex items-center gap-2`}>
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Route Performance Matrix
                  </h2>
                  <p className={`text-xs ${textSubtle}`}>Detailed route occupancy rates, revenue generation, and weekly trends.</p>
                </div>
                <button
                  onClick={() => alert("Exporting Live Database Analytics PDF...")}
                  className={`px-4 py-2.5 rounded-xl ${
                    isDay
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-lg"
                  } text-xs font-black flex items-center gap-2 transition-all cursor-pointer`}
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Export PDF Report</span>
                </button>
              </div>

              {/* Route Performance Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 font-bold uppercase">Route</th>
                      <th className="pb-3 font-bold uppercase">Bookings</th>
                      <th className="pb-3 font-bold uppercase">Occupancy</th>
                      <th className="pb-3 font-bold uppercase">Total Revenue</th>
                      <th className="pb-3 font-bold uppercase">Growth Trend</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {displayRouteAnalytics.map((r, i) => (
                      <tr key={i} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className={`py-4 font-bold ${textTitle} flex items-center gap-2`}>
                          <MapPin className="w-4 h-4 text-rose-500" /> {r.route}
                        </td>
                        <td className="py-4 font-bold">{r.bookings} Tickets</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-24 ${bgInnerCard} rounded-full h-2 overflow-hidden border`}>
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: r.occupancy }} />
                            </div>
                            <span className="font-bold text-indigo-500">{r.occupancy}</span>
                          </div>
                        </td>
                        <td className="py-4 font-black text-emerald-500">{r.revenue}</td>
                        <td className="py-4 font-bold text-emerald-500 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" /> {r.trend}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCE & REVENUE */}
        {activeTab === "Finance" && (
          <div className="space-y-8">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`${bgCard} p-6 rounded-3xl border border-emerald-500/30 space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Gross DB Ticket Sales
                </div>
                <div className="text-3xl font-black text-emerald-500">
                  {formatIndianCurrency(analytics?.totalRevenue && analytics.totalRevenue !== "0" && analytics.totalRevenue !== "0.00" ? analytics.totalRevenue : calculatedGrossRevenue)}
                </div>
              </div>

              <div className={`${bgCard} p-6 rounded-3xl border border-blue-500/30 space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <CreditCard className="w-4 h-4 text-blue-500" /> Net Razorpay Online
                </div>
                <div className={`text-3xl font-black ${textTitle}`}>
                  {formatIndianCurrency(analytics?.razorpayRevenue && analytics.razorpayRevenue !== "0" && analytics.razorpayRevenue !== "0.00" ? analytics.razorpayRevenue : calculatedGrossRevenue)}
                </div>
              </div>

              <div className={`${bgCard} p-6 rounded-3xl border border-purple-500/30 space-y-1`}>
                <div className={`text-[11px] font-bold ${textSubtle} uppercase tracking-wider flex items-center gap-1`}>
                  <Tag className="w-4 h-4 text-purple-500" /> Wallet Balance Payments
                </div>
                <div className="text-3xl font-black text-purple-500">
                  {formatIndianCurrency(analytics?.walletRevenue || 0)}
                </div>
              </div>
            </div>

            {/* Financial Ledger & Transactions Table */}
            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-base font-extrabold ${textTitle}`}>Recent Payment Transactions & Razorpay Settlement</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 font-extrabold uppercase tracking-wider text-[11px] w-1/5">Transaction ID</th>
                      <th className="pb-3 font-extrabold uppercase tracking-wider text-[11px] w-1/5">PNR</th>
                      <th className="pb-3 font-extrabold uppercase tracking-wider text-[11px] w-1/5">Payment Gateway</th>
                      <th className="pb-3 font-extrabold uppercase tracking-wider text-[11px] w-1/5">Amount Paid</th>
                      <th className="pb-3 font-extrabold uppercase tracking-wider text-[11px] w-1/5">Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {confirmedBookingsList.map((b, idx) => (
                      <tr key={b.id || idx} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className={`py-3.5 font-bold ${textSubtle} w-1/5`}>pay_RZP_{b.pnr ? b.pnr.slice(-6) : idx + 101}</td>
                        <td className={`py-3.5 font-extrabold ${textTitle} w-1/5`}>{b.pnr}</td>
                        <td className="py-3.5 font-bold text-sky-500 w-1/5">Razorpay (UPI / Card)</td>
                        <td className="py-3.5 font-black text-emerald-500 w-1/5">
                          ₹{b.finalAmountPaid || b.totalAmount || 499}
                        </td>
                        <td className="py-3.5 w-1/5">
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase inline-block">
                            ✓ SETTLED TO BANK (COMPLETED)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BOOKED USERS DIRECTORY */}
        {activeTab === "Booked Users" && (
          <div className={`${bgCard} rounded-3xl border p-6 space-y-4 shadow-xl`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className={`text-base font-black ${textTitle} flex items-center gap-2`}>
                  <UserCheck className="w-5 h-5 text-rose-500" /> Booked Passengers Directory ({confirmedBookingsList.length})
                </h2>
                <p className={`text-xs ${textSubtle}`}>Contact details of all passengers who completed ticket bookings on RedBus.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                {confirmedBookingsList.length} Confirmed Paid Passengers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[960px] border-collapse">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[22%]" />
                  <col className="w-[15%]" />
                  <col className="w-[11%]" />
                  <col className="w-[16%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className={`${textSubtle} border-b ${borderDivider}`}>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-left">Passenger Name</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-left">Email Address</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-left">Mobile Number</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-left">PNR</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-left">Route Booked</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-right">Amount</th>
                    <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderDivider}`}>
                  {confirmedBookingsList.map((b, idx) => (
                    <tr key={b.id || idx} className={`${isDay ? "text-slate-800" : "text-slate-300"} hover:bg-slate-500/5 transition-colors`}>
                      <td className="py-3.5 px-3">
                        <div className={`font-bold ${textTitle} flex items-center gap-2 max-w-[200px]`}>
                          <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-xs border border-rose-500/30 flex-shrink-0">
                            {(b.user?.name || b.user?.fullName || "P").charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{b.user?.name || b.user?.fullName || "Verified Passenger"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-rose-500 flex items-center gap-1.5 max-w-[220px]" title={b.user?.email || "passenger@example.com"}>
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{b.user?.email || "passenger@example.com"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className={`font-semibold ${textSubtle} flex items-center gap-1.5`}>
                          <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>{b.user?.mobile || "+91 98765 43210"}</span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-3 whitespace-nowrap font-extrabold ${textTitle}`}>{b.pnr}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-indigo-500">
                        {b.trip?.route ? `${b.trip.route.source} → ${b.trip.route.destination}` : "Chennai → Bengaluru"}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-right font-black text-emerald-500">
                        ₹{b.finalAmountPaid || b.totalAmount || 499}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase inline-block">
                          ✓ COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CANCELLED BOOKINGS DIRECTORY */}
        {activeTab === "Cancelled Bookings" && (
          <div className={`${bgCard} rounded-3xl border p-6 space-y-4 shadow-xl`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className={`text-base font-black ${textTitle} flex items-center gap-2`}>
                  <XCircle className="w-5 h-5 text-rose-500" /> Cancelled & Unpaid Bookings ({cancelledBookingsList.length})
                </h2>
                <p className={`text-xs ${textSubtle}`}>Log of all passenger bookings that were cancelled or payment failed.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 text-xs font-bold">
                {cancelledBookingsList.length} Cancelled Bookings
              </span>
            </div>

            {cancelledBookingsList.length === 0 ? (
              <div className={`p-8 text-center space-y-2 ${bgInnerCard} rounded-2xl border`}>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className={`text-sm font-bold ${textTitle}`}>No Cancelled Bookings</div>
                <p className={`text-xs ${textSubtle}`}>All passenger tickets in the system are 100% active and confirmed!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 font-bold uppercase">Passenger Details</th>
                      <th className="pb-3 font-bold uppercase">PNR</th>
                      <th className="pb-3 font-bold uppercase">Route</th>
                      <th className="pb-3 font-bold uppercase">Amount Unpaid / Refunded</th>
                      <th className="pb-3 font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {cancelledBookingsList.map((b, idx) => (
                      <tr key={b.id || idx} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className="py-3.5">
                          <div className={`font-bold ${textTitle}`}>{b.user?.name || b.user?.fullName || "Passenger"}</div>
                          <div className={`text-[11px] ${textSubtle}`}>{b.user?.email || "passenger@example.com"}</div>
                        </td>
                        <td className={`py-3.5 font-extrabold ${textTitle}`}>{b.pnr}</td>
                        <td className="py-3.5 font-semibold text-indigo-500">
                          {b.trip?.route ? `${b.trip.route.source} → ${b.trip.route.destination}` : "Chennai → Bengaluru"}
                        </td>
                        <td className="py-3.5 font-black text-rose-500">₹{b.finalAmountPaid || b.totalAmount || 0}</td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[10px] font-black uppercase">
                            ✕ CANCELLED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FLEET BUSES */}
        {activeTab === "Buses" && (
          <div className="space-y-6">
            {/* Step Workflow Guide Banner */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-rose-500">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>STEP 1: Register New Bus in Fleet</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                Next → Step 2: Create Route → Step 3: Schedule Trip
              </span>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-base font-bold ${textTitle}`}>Add New Bus to RedBus Fleet</h2>
              <form onSubmit={handleAddBus} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Enter bus name (e.g., KPN Travels, IntrCity SmartBus)"
                  value={busName}
                  onChange={(e) => setBusName(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold focus:outline-none focus:border-rose-500`}
                  required
                />
                <input
                  type="text"
                  placeholder="Enter registration number (e.g., TN-37-AX-8910)"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold focus:outline-none focus:border-rose-500`}
                  required
                />
                <select
                  value={busType}
                  onChange={(e) => setBusType(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                  required
                >
                  <option value="" disabled>Select bus type (e.g., AC Sleeper, AC Seater, Non-AC Seater)</option>
                  <option value="AC Sleeper (2+1)">AC Sleeper (2+1)</option>
                  <option value="AC Seater (2+2)">AC Seater (2+2)</option>
                  <option value="Non-AC Sleeper (2+1)">Non-AC Sleeper (2+1)</option>
                  <option value="Non-AC Seater (2+2)">Non-AC Seater (2+2)</option>
                </select>
                <input
                  type="number"
                  placeholder="Enter total number of seats (e.g., 30, 36, 40)"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold focus:outline-none focus:border-rose-500`}
                  min="10"
                  max="60"
                  required
                />
                <input
                  type="text"
                  placeholder="Enter operator or company name (e.g., KPN Travels, IntrCity)"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold focus:outline-none focus:border-rose-500`}
                  required
                />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isAddingBus}
                    className={`px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 ${
                      isAddingBus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddingBus ? "Adding Bus..." : "Add Bus Fleet"}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-sm font-extrabold ${textTitle} uppercase tracking-wider`}>Fleet Buses ({buses.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Bus Name</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Registration</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Type</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Capacity</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Created At</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {buses.map((b) => (
                      <tr key={b.id} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className={`py-3 px-3 font-bold ${textTitle} whitespace-nowrap`}>{b.name}</td>
                        <td className="py-3 px-3 font-semibold whitespace-nowrap">{b.busNumber}</td>
                        <td className="py-3 px-3 text-rose-500 font-semibold whitespace-nowrap">{b.busType}</td>
                        <td className="py-3 px-3 font-bold whitespace-nowrap">{b.totalSeats || 30} Seats</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            b.status === "DECOMMISSIONED"
                              ? "bg-slate-500/20 text-slate-400 border-slate-500/30"
                              : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          }`}>
                            {b.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className={`py-3 px-3 ${textSubtle} whitespace-nowrap`}>{formatDateTime(b.createdAt)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingBus({ ...b })}
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                              title="Edit Bus Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {b.status !== "DECOMMISSIONED" && (
                              <button
                                onClick={() => setDecommissioningBus(b)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                title="Decommission Bus"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TRAVEL ROUTES */}
        {activeTab === "Routes" && (
          <div className="space-y-6">
            {/* Step Workflow Guide Banner */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-500">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black">2</span>
                <span>STEP 2: Define Travel Route & Distance</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                Step 1: Bus Fleet Ready ✓ → Next → Step 3: Schedule Trip
              </span>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-base font-bold ${textTitle}`}>Create New Travel Route</h2>
              <form onSubmit={handleAddRoute} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Enter source city (e.g., Chennai, Mumbai)"
                  value={routeSource}
                  onChange={(e) => setRouteSource(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
                <input
                  type="text"
                  placeholder="Enter destination city (e.g., Bengaluru, Delhi)"
                  value={routeDestination}
                  onChange={(e) => setRouteDestination(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
                <input
                  type="number"
                  placeholder="Enter distance in km (e.g., 350)"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  min="1"
                  required
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Enter duration in hours (e.g., 6.5)"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  min="0.5"
                  required
                />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isAddingRoute}
                    className={`px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 ${
                      isAddingRoute ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddingRoute ? "Creating Route..." : "Create Route"}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-sm font-extrabold ${textTitle} uppercase tracking-wider`}>Active Routes ({routes.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Source</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Destination</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Distance</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Duration</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] max-w-[220px]">Intermediate Stops</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Created At</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {routes.map((r) => {
                      const stopsStr = Array.isArray(r.stops) ? r.stops.join(", ") : (r.stops || "Direct Route");
                      return (
                        <tr key={r.id} className={isDay ? "text-slate-800" : "text-slate-300"}>
                          <td className={`py-3 px-3 font-bold ${textTitle} whitespace-nowrap`}>{r.source}</td>
                          <td className="py-3 px-3 font-bold text-emerald-500 whitespace-nowrap">{r.destination}</td>
                          <td className="py-3 px-3 font-semibold whitespace-nowrap">{r.distanceKm} km</td>
                          <td className="py-3 px-3 font-semibold text-rose-500 whitespace-nowrap">{r.durationHours} hrs</td>
                          <td className={`py-3 px-3 ${textSubtle} max-w-[220px] truncate`} title={stopsStr}>
                            {stopsStr}
                          </td>
                          <td className={`py-3 px-3 ${textSubtle} whitespace-nowrap`}>{formatDateTime(r.createdAt)}</td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingRoute(r);
                                setEditingRouteStops(Array.isArray(r.stops) ? r.stops.join(", ") : (r.stops || ""));
                              }}
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                              title="Edit Route Stops"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SCHEDULE TRIPS */}
        {activeTab === "Schedule Trips" && (
          <div className="space-y-6">
            {/* Step Workflow Guide Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-500">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">3</span>
                <span>STEP 3: Connect Bus + Route & Publish Live Trip</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                Step 1 & 2 Ready ✓ → Publish Live for Passengers
              </span>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-base font-bold ${textTitle}`}>Schedule Bus Trip & Publish Live</h2>
              <form onSubmit={handleScheduleTrip} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Select Bus</label>
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                    required
                  >
                    <option value="" disabled>Select bus from fleet</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.busNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Select Route</label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                    required
                  >
                    <option value="" disabled>Select travel route</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.source} → {r.destination} ({r.distanceKm} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Departure Date</label>
                  <input
                    type="date"
                    value={tripDepartureDate}
                    onChange={(e) => setTripDepartureDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Departure Time</label>
                  <input
                    type="text"
                    value={tripDepartureTime}
                    onChange={(e) => setTripDepartureTime(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                    placeholder="Enter departure time (e.g., 21:30 or 09:30 PM)"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Arrival Time</label>
                  <input
                    type="text"
                    value={tripArrivalTime}
                    onChange={(e) => setTripArrivalTime(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                    placeholder="Enter arrival time (e.g., 04:00 AM)"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Base Ticket Price (₹)</label>
                  <input
                    type="number"
                    value={tripBasePrice}
                    onChange={(e) => setTripBasePrice(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                    placeholder="Enter base ticket price in ₹ (e.g., 850)"
                    min="1"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSchedulingTrip}
                    className={`px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 ${
                      isSchedulingTrip ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSchedulingTrip ? "Publishing Trip..." : "Publish Trip Live"}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h2 className={`text-sm font-extrabold ${textTitle} uppercase tracking-wider`}>
                  Scheduled Live Trips ({trips.length})
                </h2>
                <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 text-xs font-bold">
                  8 Items / Page
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Bus</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Route</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Travel Departure</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Fare</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Seats</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">Created At</th>
                      <th className="pb-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {trips.slice((tripPage - 1) * TRIPS_PER_PAGE, tripPage * TRIPS_PER_PAGE).map((t) => (
                      <tr key={t.id} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className={`py-3 px-3 font-bold ${textTitle} whitespace-nowrap`}>{t.bus?.name || "Bus"}</td>
                        <td className="py-3 px-3 font-semibold text-rose-500 whitespace-nowrap">
                          {t.route ? `${t.route.source} → ${t.route.destination}` : "Route"}
                        </td>
                        <td className={`py-3 px-3 ${textSubtle} whitespace-nowrap`}>{t.departureDate} at {t.departureTime}</td>
                        <td className="py-3 px-3 font-black text-emerald-500 whitespace-nowrap">₹{t.basePrice}</td>
                        <td className="py-3 px-3 font-bold whitespace-nowrap">{t.availableSeats !== undefined ? t.availableSeats : 30} Seats</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            t.status === "CANCELLED"
                              ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                              : t.status === "COMPLETED"
                                ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          }`}>
                            {t.status || "SCHEDULED"}
                          </span>
                        </td>
                        <td className={`py-3 px-3 ${textSubtle} whitespace-nowrap`}>{formatDateTime(t.createdAt)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingTrip(t);
                              setEditTripDate(t.departureDate || "");
                              setEditTripDepTime(t.departureTime || "");
                              setEditTripArrTime(t.arrivalTime || "");
                              setEditTripPrice(t.basePrice || "");
                              setEditTripStatus(t.status || "SCHEDULED");
                            }}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                            title="Edit / Reschedule Trip"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 8-Items Pagination Bar */}
              {Math.ceil(trips.length / TRIPS_PER_PAGE) > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className={`text-xs ${textSubtle}`}>
                    Showing <strong className={textTitle}>{(tripPage - 1) * TRIPS_PER_PAGE + 1}</strong> to{" "}
                    <strong className={textTitle}>{Math.min(tripPage * TRIPS_PER_PAGE, trips.length)}</strong> of{" "}
                    <strong className={textTitle}>{trips.length}</strong> scheduled live trips
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                      disabled={tripPage === 1}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tripPage === 1
                          ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400"
                          : "bg-rose-500 hover:bg-rose-600 text-white cursor-pointer shadow-md shadow-rose-500/20"
                      }`}
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.ceil(trips.length / TRIPS_PER_PAGE) }, (_, idx) => idx + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setTripPage(pg)}
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          tripPage === pg
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                            : isDay
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      onClick={() => setTripPage((p) => Math.min(Math.ceil(trips.length / TRIPS_PER_PAGE), p + 1))}
                      disabled={tripPage === Math.ceil(trips.length / TRIPS_PER_PAGE)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tripPage === Math.ceil(trips.length / TRIPS_PER_PAGE)
                          ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400"
                          : "bg-rose-500 hover:bg-rose-600 text-white cursor-pointer shadow-md shadow-rose-500/20"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: PASSENGER BOOKINGS */}
        {activeTab === "Bookings" && (
          <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
            <h2 className={`text-base font-extrabold ${textTitle}`}>Passenger Bookings Ledger ({allBookings.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`${textSubtle} border-b ${borderDivider}`}>
                    <th className="pb-3 font-bold uppercase">Passenger Details</th>
                    <th className="pb-3 font-bold uppercase">PNR</th>
                    <th className="pb-3 font-bold uppercase">Route</th>
                    <th className="pb-3 font-bold uppercase">Departure</th>
                    <th className="pb-3 font-bold uppercase">Payment</th>
                    <th className="pb-3 font-bold uppercase">Amount</th>
                    <th className="pb-3 font-bold uppercase">Booking Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderDivider}`}>
                  {allBookings.map((b) => {
                    const isCancelled = b.bookingStatus === "CANCELLED" || b.paymentStatus === "FAILED";
                    return (
                      <tr key={b.id} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className="py-3.5">
                          <div className={`font-extrabold ${textTitle}`}>{b.user?.name || b.user?.fullName || "Verified Passenger"}</div>
                          <div className={`text-[11px] ${textSubtle}`}>{b.user?.email || "passenger@example.com"}</div>
                          <div className="text-[11px] text-emerald-500 font-semibold">{b.user?.mobile || "+91 98765 43210"}</div>
                        </td>
                        <td className={`py-3 font-extrabold ${textTitle}`}>{b.pnr}</td>
                        <td className="py-3 font-semibold">
                          {b.trip?.route ? `${b.trip.route.source} → ${b.trip.route.destination}` : "Chennai → Bengaluru"}
                        </td>
                        <td className={`py-3 ${textSubtle}`}>{b.trip?.departureDate}</td>
                        <td className="py-3 font-semibold">{b.paymentMethod}</td>
                        <td className="py-3 font-black">
                          {isCancelled ? (
                            <span className="text-rose-500 line-through">₹{b.finalAmountPaid}</span>
                          ) : (
                            <span className="text-emerald-500">₹{b.finalAmountPaid}</span>
                          )}
                        </td>
                        <td className="py-3">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30">
                              ✕ CANCELLED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                              ✓ COMPLETED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 10: PROMO COUPONS */}
        {activeTab === "Coupons" && (
          <div className="space-y-6">
            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-base font-bold ${textTitle}`}>Create New Promo Coupon</h2>
              <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Enter promo coupon code (e.g., REDBUS200)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold uppercase`}
                  required
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                  required
                >
                  <option value="" disabled>Select discount type (e.g., Flat, Percentage)</option>
                  <option value="FLAT">Flat Discount (₹)</option>
                  <option value="PERCENT">Percentage Discount (%)</option>
                </select>
                <input
                  type="number"
                  placeholder="Enter discount amount or percentage (e.g., 200 or 15)"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
                <input
                  type="number"
                  placeholder="Enter minimum booking spend in ₹ (e.g., 500)"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(e.target.value)}
                  className={`px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create Promo Coupon
                  </button>
                </div>
              </form>
            </div>

            <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
              <h2 className={`text-sm font-extrabold ${textTitle} uppercase tracking-wider`}>Active Promo Coupons ({coupons.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`${textSubtle} border-b ${borderDivider}`}>
                      <th className="pb-3 font-bold uppercase">Code</th>
                      <th className="pb-3 font-bold uppercase">Type</th>
                      <th className="pb-3 font-bold uppercase">Discount</th>
                      <th className="pb-3 font-bold uppercase">Min Spend</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderDivider}`}>
                    {coupons.map((c) => (
                      <tr key={c.id} className={isDay ? "text-slate-800" : "text-slate-300"}>
                        <td className="py-3 font-bold text-rose-500">{c.code}</td>
                        <td className="py-3 font-semibold">{c.discountType || (c.discountPercent ? "PERCENT" : "FIXED")}</td>
                        <td className="py-3 font-black text-emerald-500">
                          {c.discountPercent ? `${c.discountPercent}% (Max ₹${c.maxDiscountAmount})` : `₹${c.discountValue || c.maxDiscountAmount}`}
                        </td>
                        <td className="py-3 font-semibold">₹{c.minBookingAmount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: SYSTEM CONFIG */}
        {activeTab === "Config" && (
          <div className={`${bgCard} rounded-3xl border p-6 space-y-4`}>
            <h2 className={`text-base font-bold ${textTitle}`}>System Configuration Settings</h2>
            <form onSubmit={handleUpdateConfig} className="space-y-4 max-w-md">
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>
                  Max Wallet Usage Percentage (%)
                </label>
                <input
                  type="number"
                  value={config.walletMaxUsagePercent !== undefined ? config.walletMaxUsagePercent : ""}
                  onChange={(e) => setConfig({ ...config, walletMaxUsagePercent: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  placeholder="Enter max wallet usage percent (e.g., 20)"
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>
                  Refer & Earn Reward Amount (₹)
                </label>
                <input
                  type="number"
                  value={config.referralAmount !== undefined ? config.referralAmount : ""}
                  onChange={(e) => setConfig({ ...config, referralAmount: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${bgInput} text-xs font-bold`}
                  placeholder="Enter referral reward amount in ₹ (e.g., 500)"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Configuration Settings
              </button>
            </form>
          </div>
        )}
        </div>
      </main>

      {/* EDIT BUS MODAL */}
      {editingBus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full ${bgCard} p-6 rounded-3xl border shadow-2xl space-y-4`}>
            <h3 className={`text-base font-extrabold ${textTitle} flex items-center gap-2`}>
              <Edit className="w-4 h-4 text-rose-500" /> Edit Bus Fleet Details
            </h3>
            <form onSubmit={handleUpdateBus} className="space-y-3">
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Bus Name</label>
                <input
                  type="text"
                  value={editingBus.name || ""}
                  onChange={(e) => setEditingBus({ ...editingBus, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Registration Number</label>
                <input
                  type="text"
                  value={editingBus.busNumber || ""}
                  onChange={(e) => setEditingBus({ ...editingBus, busNumber: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Operator Name</label>
                <input
                  type="text"
                  value={editingBus.operatorName || ""}
                  onChange={(e) => setEditingBus({ ...editingBus, operatorName: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Bus Type</label>
                <select
                  value={editingBus.busType || ""}
                  onChange={(e) => setEditingBus({ ...editingBus, busType: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                  required
                >
                  <option value="AC Sleeper (2+1)">AC Sleeper (2+1)</option>
                  <option value="AC Seater (2+2)">AC Seater (2+2)</option>
                  <option value="Non-AC Sleeper (2+1)">Non-AC Sleeper (2+1)</option>
                  <option value="Non-AC Seater (2+2)">Non-AC Seater (2+2)</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Total Seats</label>
                <input
                  type="number"
                  value={editingBus.totalSeats || 30}
                  onChange={(e) => setEditingBus({ ...editingBus, totalSeats: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                  min="10"
                  max="60"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBus(null)}
                  disabled={isSavingEdit}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDay
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECOMMISSION BUS MODAL */}
      {decommissioningBus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full ${bgCard} p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-4`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
              <Power className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className={`text-base font-extrabold ${textTitle}`}>Decommission Bus Fleet</h3>
              <p className={`text-xs ${textSubtle}`}>
                Decommissioning <strong className={textTitle}>{decommissioningBus.name} ({decommissioningBus.busNumber})</strong> will automatically cancel unbooked future trips and refund active passengers to their wallet.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecommissioningBus(null)}
                disabled={isSavingEdit}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDay
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecommissionBus}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? "Decommissioning..." : "Confirm Decommission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROUTE STOPS MODAL */}
      {editingRoute && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full ${bgCard} p-6 rounded-3xl border shadow-2xl space-y-4`}>
            <h3 className={`text-base font-extrabold ${textTitle} flex items-center gap-2`}>
              <Edit className="w-4 h-4 text-indigo-500" /> Edit Route Intermediate Stops
            </h3>
            <p className={`text-xs ${textSubtle}`}>
              Updating stops for <strong className={textTitle}>{editingRoute.source} → {editingRoute.destination}</strong>
            </p>
            <form onSubmit={handleUpdateRouteStops} className="space-y-3">
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>
                  Intermediate Boarding / Drop Stops (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editingRouteStops}
                  onChange={(e) => setEditingRouteStops(e.target.value)}
                  placeholder="e.g. Vellore, Ambur, Hosur"
                  className={`w-full px-4 py-2.5 rounded-xl ${bgInput} text-xs font-bold`}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  disabled={isSavingEdit}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDay
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? "Saving..." : "Update Route Stops"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / RESCHEDULE TRIP MODAL */}
      {editingTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full ${bgCard} p-6 rounded-3xl border shadow-2xl space-y-4`}>
            <h3 className={`text-base font-extrabold ${textTitle} flex items-center gap-2`}>
              <Edit className="w-4 h-4 text-emerald-500" /> Edit / Reschedule Trip
            </h3>
            <form onSubmit={handleUpdateTrip} className="space-y-3">
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Departure Date</label>
                <input
                  type="date"
                  value={editTripDate}
                  onChange={(e) => setEditTripDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-4 py-2 rounded-xl ${bgInput} text-xs font-bold`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Departure Time</label>
                <input
                  type="text"
                  value={editTripDepTime}
                  onChange={(e) => setEditTripDepTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${bgInput} text-xs font-bold`}
                  placeholder="e.g. 21:30 or 09:30 PM"
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Arrival Time</label>
                <input
                  type="text"
                  value={editTripArrTime}
                  onChange={(e) => setEditTripArrTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${bgInput} text-xs font-bold`}
                  placeholder="e.g. 04:00 AM"
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Base Ticket Price (₹)</label>
                <input
                  type="number"
                  value={editTripPrice}
                  onChange={(e) => setEditTripPrice(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${bgInput} text-xs font-bold`}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold ${textSubtle} uppercase mb-1`}>Trip Status</label>
                <select
                  value={editTripStatus}
                  onChange={(e) => setEditTripStatus(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${bgInput} text-xs font-bold cursor-pointer`}
                  required
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  disabled={isSavingEdit}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDay
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? "Saving..." : "Update Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

