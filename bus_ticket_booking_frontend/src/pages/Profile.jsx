import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import authApi from "../services/authApi";
import { setCredentials } from "../features/auth/authSlice";
import { User as UserIcon, Share2, Award, Users, Copy, CheckCircle2, ShieldCheck, Ticket, Edit3, Save, Phone, Mail, Send, Key } from "lucide-react";

export const Profile = () => {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [copied, setCopied] = useState(false);

  // Profile Edit Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchReferrals();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      const data = res.data.data;
      setProfile(data);
      setName(data?.name || "");
      setEmail(data?.email || "");
      setNewEmail(data?.email || "");
      setPhone(data?.phone ? String(data.phone).replace(/\D/g, "").slice(-10) : "");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await api.get("/referrals/my-stats");
      setReferrals(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = () => {
    if (referrals?.referralCode) {
      navigator.clipboard.writeText(referrals.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Update Name & Phone
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile phone number");
      setLoading(false);
      return;
    }

    try {
      const res = await api.put("/auth/profile", { name, phone: cleanPhone });
      setMsg("Profile name and mobile number updated successfully!");
      setProfile(res.data.data);
      
      const token = localStorage.getItem("accessToken");
      if (token && res.data.data) {
        dispatch(setCredentials({ user: res.data.data, token }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 1: Send OTP for Email Change
  const handleRequestEmailOtp = async () => {
    if (!newEmail || newEmail === email) {
      setError("Please enter a new email address different from your current email");
      return;
    }
    setLoading(true);
    setMsg("");
    setError("");
    try {
      const res = await authApi.requestEmailChange({ newEmail });
      setMsg(res.data.message || `6-digit OTP code sent to ${newEmail}`);
      setIsEmailOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send email OTP");
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 2: Verify OTP & Change Email
  const handleVerifyEmailOtpSubmit = async (e) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }
    setLoading(true);
    setMsg("");
    setError("");
    try {
      const res = await authApi.verifyEmailChange({ newEmail, otp: emailOtp });
      setMsg("Email address verified and updated successfully!");
      setProfile(res.data.data);
      setEmail(res.data.data.email);
      setIsEmailOtpSent(false);
      setEmailOtp("");

      const token = localStorage.getItem("accessToken");
      if (token && res.data.data) {
        dispatch(setCredentials({ user: res.data.data, token }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify email OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* User Info Header Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/30 flex flex-col sm:flex-row items-center gap-6 shadow-2xl bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-rose-600/30 flex-shrink-0">
          {profile?.name?.charAt(0) || "U"}
        </div>
        <div className="text-center sm:text-left space-y-1 w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{profile?.name || "User Profile"}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
              Verified Member
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {profile?.email} • {profile?.phone ? `+91 ${profile.phone}` : "Mobile unlinked"}
          </p>
        </div>
      </div>

      {/* Edit Profile Details Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="border-b border-white/5 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-rose-500" />
            <span>Update Personal Details</span>
          </h2>
          <span className="text-[11px] text-slate-400">Modify your name, contact phone & email with OTP verification</span>
        </div>

        {msg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Update Name & Mobile */}
        <form onSubmit={handleUpdateProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-white/5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-rose-500" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-xs font-bold"
              placeholder="Enter full name (e.g., John Doe)"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-rose-500" /> Mobile Phone Number
            </label>
            <div className="flex items-center glass-input rounded-xl overflow-hidden px-3">
              <span className="text-xs font-bold text-slate-400 border-r border-white/10 pr-3">+91</span>
              <input
                type="text"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-3 py-3 bg-transparent text-xs font-bold tracking-widest text-white focus:outline-none"
                placeholder="Enter 10-digit mobile number (e.g., 9876543210)"
                required
              />
            </div>
          </div>

          <div className="sm:col-span-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "SAVING..." : "UPDATE NAME & PHONE"}</span>
            </button>
          </div>
        </form>

        {/* Section 2: Update Email Address via 6-Digit Email OTP */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-rose-500" /> Email Address (Requires 6-Digit OTP Verification)
            </label>
            <span className="text-[10px] text-emerald-400 font-bold">Current: {email}</span>
          </div>

          {!isEmailOtpSent ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-bold"
                placeholder="Enter new email address (e.g., john@example.com)"
                required
              />
              <button
                type="button"
                onClick={handleRequestEmailOtp}
                disabled={loading || newEmail === email}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-rose-400" />
                <span>{loading ? "SENDING OTP..." : "SEND EMAIL OTP"}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyEmailOtpSubmit} className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 space-y-3">
              <div className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Key className="w-4 h-4 text-rose-400" />
                <span>Enter 6-Digit OTP sent to <strong className="text-white">{newEmail}</strong>:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl glass-input text-center text-lg font-black tracking-widest text-rose-400"
                  placeholder="Enter 6-digit OTP code (e.g., 123456)"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? "VERIFYING..." : "VERIFY OTP & UPDATE EMAIL"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Referral Program Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-rose-500" />
            <span>RedBus Refer & Earn Program</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Share your unique referral code. When your friend completes their first bus ticket booking,{" "}
            <strong className="text-emerald-400">₹500</strong> referral reward is credited directly to your RedBus Wallet!
          </p>
        </div>

        {/* Code Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest block">
              YOUR PERSONAL REFERRAL CODE
            </span>
            <span className="text-2xl font-black text-white tracking-widest">
              {referrals?.referralCode || "REDBUS500"}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "COPIED!" : "COPY CODE"}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
            <Users className="w-5 h-5 text-rose-400 mx-auto" />
            <div className="text-[11px] text-slate-400 font-semibold">Total Referrals Invited</div>
            <div className="text-xl font-black text-white">{referrals?.totalReferrals || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
            <Award className="w-5 h-5 text-emerald-400 mx-auto" />
            <div className="text-[11px] text-slate-400 font-semibold">Successful Bookings</div>
            <div className="text-xl font-black text-emerald-400">{referrals?.successfulCount || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1">
            <Ticket className="w-5 h-5 text-sky-400 mx-auto" />
            <div className="text-[11px] text-slate-400 font-semibold">Total Wallet Cashback</div>
            <div className="text-xl font-black text-emerald-400">₹{referrals?.totalEarnings || 0}</div>
          </div>
        </div>

        {/* Referred Friends Status Table */}
        {referrals?.referredUsers && referrals.referredUsers.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="text-xs font-bold text-slate-300">Referred Friends & Status</div>
            <div className="space-y-2">
              {referrals.referredUsers.map((u) => (
                <div key={u.referralId} className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-extrabold text-white">{u.refereeName} <span className="text-[11px] text-slate-400 font-normal">({u.refereeEmail})</span></div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      u.status === "SUCCESSFUL"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}>
                      {u.status === "SUCCESSFUL" ? "✓ SUCCESSFUL" : "⏳ PENDING 1st BOOKING"}
                    </span>
                    {u.status === "SUCCESSFUL" && (
                      <span className="text-xs font-black text-emerald-400">
                        +₹{u.rewardAmount} Credited
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
