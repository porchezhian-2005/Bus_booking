import React, { useState, useEffect } from "react";
import authApi from "../services/authApi";
import { Mail, ShieldCheck, User, Phone, Lock, Share2, ArrowRight, Bus, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Link } from "react-router";

export const Register = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    if (step === 2 && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const cleanPhone = phone.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length !== 10) {
        setError("Please enter a valid 10-digit mobile phone number");
        setLoading(false);
        return;
      }
      const res = await authApi.register({ name, email, phone: cleanPhone, password, referralCode });
      setMsg(res.data.message);
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await authApi.verifyOtp({ email, otp });
      setMsg("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "OTP Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await authApi.resendOtp({ email });
      setMsg(res.data.message || "A new 6-digit OTP code has been sent to your email.");
      setOtp("");
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP code");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full glass-card p-8 shadow-2xl border border-rose-500/30 rounded-3xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {step === 1 ? "Join redBus" : "Verify Email OTP"}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1 ? "Earn ₹500 referral bonus & instant ticket booking" : "Enter the verification code sent to your email"}
          </p>
        </div>

        {msg && <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold">{msg}</div>}
        {error && <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center font-bold">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-rose-500" /> Full Name
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl glass-input text-xs font-medium" placeholder="Enter full name (e.g., John Doe)" required />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-rose-500" /> Email Address
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl glass-input text-xs font-medium" placeholder="Enter email address (e.g., john@example.com)" required />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-rose-500" /> Mobile Phone
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

            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-rose-500" /> Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl glass-input text-xs font-bold"
                  placeholder="Enter password (minimum 6 characters)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide Password" : "Show Password"}
                  aria-label={showPassword ? "Hide Password" : "Show Password"}
                  className="absolute right-3 text-slate-400 hover:text-white cursor-pointer transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-rose-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Referral Code (Optional - Earn ₹500)
              </label>
              <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl glass-input text-xs font-bold uppercase" placeholder="Enter referral code if available (e.g., REDBUS500)" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer">
              {loading ? "SENDING OTP..." : "SEND OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <p className="text-xs text-slate-400 text-center mb-2">Please enter the 6-digit OTP code sent to <strong>{email}</strong></p>
            <div className="flex gap-2">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-black tracking-widest text-rose-400" placeholder="Enter 6-digit OTP code (e.g., 123456)" maxLength={6} required />
              <button type="submit" disabled={loading} className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer whitespace-nowrap">
                {loading ? "..." : "VERIFY"}
              </button>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
              <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                ← Edit Info
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || resendLoading}
                className={`font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  cooldown > 0 || resendLoading
                    ? "text-slate-500 cursor-not-allowed"
                    : "text-rose-400 hover:underline"
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
                <span>{resendLoading ? "Resending..." : cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
          Already registered?{" "}
          <Link to="/login" className="text-rose-400 font-bold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
