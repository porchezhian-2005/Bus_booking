import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { loginUser, adminLoginUser } from "../features/auth/authSlice";
import authApi from "../services/authApi";
import { Bus, Lock, Mail, ShieldCheck, User, ArrowRight, CheckCircle2, AlertCircle, X, Key, Eye, EyeOff, RotateCcw } from "lucide-react";

export const Login = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.includes("/admin");
  const [portal, setPortal] = useState(isAdminPath ? "ADMIN" : "USER");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // React Hook Form
  const { register, handleSubmit, setValue } = useForm();

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Unverified Email Verification Flow State
  const [isVerifyMode, setIsVerifyMode] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, role, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && role) {
      const normalizedRole = String(role).toUpperCase();
      const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (normalizedRole === "USER") {
        navigate("/", { replace: true });
      }
    }
  }, [token, role, navigate]);

  useEffect(() => {
    let timer;
    if (isVerifyMode && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isVerifyMode, cooldown]);

  const onSubmit = async (data) => {
    if (portal === "USER") {
      const result = await dispatch(loginUser({ email: data.email, password: data.password }));
      if (loginUser.fulfilled.match(result)) {
        toast.success("Signed in successfully!");
        const loggedUserRole = String(result.payload.user?.role || "").toUpperCase();
        if (loggedUserRole === "ADMIN" || loggedUserRole === "SUPER_ADMIN") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        const errMsg = typeof result.payload === "string" ? result.payload : "Login failed";
        if (errMsg.toLowerCase().includes("verify your email") || errMsg.toLowerCase().includes("unverified")) {
          setUnverifiedEmail(data.email);
          setIsVerifyMode(true);
          setVerifyOtp("");
          setVerifyError("");
          setVerifyMsg("Your email account is not verified yet. Request a 6-digit OTP code below to verify your email.");
          setCooldown(0);
        } else {
          toast.error(errMsg);
        }
      }
    } else {
      const result = await dispatch(adminLoginUser({ email: data.email, password: data.password }));
      if (adminLoginUser.fulfilled.match(result)) {
        toast.success("Admin login successful!");
        navigate("/admin");
      } else {
        toast.error(result.payload || "Admin login failed");
      }
    }
  };

  // Unverified Flow: Send / Resend OTP
  const handleSendVerificationOtp = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setVerifyError("");
    setVerifyMsg("");
    try {
      const res = await authApi.resendOtp({ email: unverifiedEmail });
      setVerifyMsg(res.data.message || `A 6-digit OTP verification code has been sent to ${unverifiedEmail}.`);
      setCooldown(60);
    } catch (err) {
      setVerifyError(err.response?.data?.message || "Failed to send verification OTP");
    } finally {
      setResendLoading(false);
    }
  };

  // Unverified Flow: Verify Email OTP
  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    if (!verifyOtp || verifyOtp.length !== 6) {
      setVerifyError("Please enter a valid 6-digit OTP code");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyMsg("");
    try {
      await authApi.verifyOtp({ email: unverifiedEmail, otp: verifyOtp });
      toast.success("Email verified successfully! You can now log in.");
      setIsVerifyMode(false);
      setValue("email", unverifiedEmail);
    } catch (err) {
      setVerifyError(err.response?.data?.message || "OTP verification failed. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Step 1: Request Password Reset OTP
  const handleRequestForgotOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMsg("");
    try {
      const res = await authApi.forgotPassword({ email: forgotEmail });
      setForgotMsg(res.data.message || "OTP code sent to your email!");
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.message || "Failed to send reset OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyForgotOtp = (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      setForgotError("Please enter a valid 6-digit OTP code");
      return;
    }
    setForgotError("");
    setForgotMsg("OTP verified successfully! Now set your new password below:");
    setForgotStep(3);
  };

  // Step 3: Confirm New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match!");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotMsg("");
    try {
      const res = await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword,
      });
      setForgotMsg(res.data.message || "Password reset successfully! Redirecting to sign in...");
      setTimeout(() => {
        setIsForgotMode(false);
        setForgotStep(1);
        setValue("email", forgotEmail);
        setForgotMsg("");
      }, 2000);
    } catch (err) {
      setForgotError(err.response?.data?.message || "Failed to reset password. Please check your OTP.");
      setForgotStep(2);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl shadow-2xl border border-rose-500/30 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">
            red<span className="text-rose-500">Bus</span>{" "}
            {isVerifyMode ? "Verify Email" : isForgotMode ? "Reset Password" : "Portal Sign In"}
          </h2>
          <p className="text-xs text-slate-400">
            {isVerifyMode
              ? `Complete email verification for ${unverifiedEmail}`
              : isForgotMode
              ? forgotStep === 1
                ? "Enter your email to receive a 6-digit password reset OTP"
                : forgotStep === 2
                ? "Enter the 6-digit OTP code sent to your email"
                : "Create your new password to complete reset"
              : "Select your account type to proceed"}
          </p>
        </div>

        {/* UNVERIFIED EMAIL VERIFICATION MODE */}
        {isVerifyMode ? (
          <div className="space-y-4">
            {verifyMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{verifyMsg}</span>
              </div>
            )}
            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-rose-500" /> Enter 6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-black tracking-widest text-rose-400"
                  placeholder="Enter 6-digit OTP code (e.g., 123456)"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{verifyLoading ? "VERIFYING..." : "VERIFY & ENABLE LOGIN"}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsVerifyMode(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={handleSendVerificationOtp}
                  disabled={cooldown > 0 || resendLoading}
                  className={`font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    cooldown > 0 || resendLoading
                      ? "text-slate-500 cursor-not-allowed"
                      : "text-rose-400 hover:underline"
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
                  <span>
                    {resendLoading
                      ? "Sending..."
                      : cooldown > 0
                      ? `Resend OTP (${cooldown}s)`
                      : "Send / Resend OTP"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : isForgotMode ? (
          /* FORGOT PASSWORD MODE */
          <div className="space-y-4">
            {forgotMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            )}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Request OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-rose-500" /> Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-xs font-medium"
                    placeholder="Enter registered email address (e.g., user@example.com)"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{forgotLoading ? "SENDING OTP..." : "SEND OTP"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Verify OTP Code */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-rose-500" /> Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-black tracking-widest text-rose-400"
                    placeholder="Enter 6-digit OTP code (e.g., 123456)"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>VERIFY OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 3: Enter New Password & Confirm */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-rose-500" /> New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-10 rounded-xl glass-input text-xs font-bold"
                      placeholder="Enter new password (minimum 6 characters)"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      title={showNewPassword ? "Hide Password" : "Show Password"}
                      aria-label={showNewPassword ? "Hide Password" : "Show Password"}
                      className="absolute right-3 text-slate-400 hover:text-white cursor-pointer transition-colors p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 text-rose-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-10 rounded-xl glass-input text-xs font-bold"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      title={showNewPassword ? "Hide Password" : "Show Password"}
                      aria-label={showNewPassword ? "Hide Password" : "Show Password"}
                      className="absolute right-3 text-slate-400 hover:text-white cursor-pointer transition-colors p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 text-rose-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{forgotLoading ? "RESETTING PASSWORD..." : "CONFIRM NEW PASSWORD"}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForgotMode(false);
                setForgotStep(1);
                setForgotError("");
                setForgotMsg("");
              }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-white pt-2 border-t border-white/5 flex items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </div>
        ) : (
          /* STANDARD SIGN IN MODE */
          <>
            {/* Portal Toggle Selector */}
            <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setPortal("USER");
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  portal === "USER"
                    ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-4 h-4" /> Passenger Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortal("ADMIN");
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  portal === "ADMIN"
                    ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Admin Portal
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Unified Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-rose-500" /> {portal === "USER" ? "User Email" : "Admin Email"}
                </label>
                <input
                  type="email"
                  {...register("email", { required: true })}
                  className="w-full px-4 py-3 rounded-xl glass-input text-xs font-bold"
                  placeholder={portal === "USER" ? "Enter user email address (e.g., john@example.com)" : "Enter admin email address (e.g., admin@busticket.com)"}
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-rose-500" /> Password
                  </label>
                  {portal === "USER" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotStep(1);
                      }}
                      className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password", { required: true })}
                    className="w-full px-4 py-3 pr-10 rounded-xl glass-input text-xs font-bold"
                    placeholder="Enter your password"
                    autoComplete="new-password"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{loading ? "AUTHENTICATING..." : portal === "USER" ? "SIGN IN AS PASSENGER" : "LOG IN TO ADMIN PANEL"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {portal === "USER" && (
              <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
                New to RedBus?{" "}
                <Link to="/register" className="text-rose-400 font-bold hover:underline">
                  Create an Account
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
