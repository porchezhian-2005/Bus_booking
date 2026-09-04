import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { adminLoginUser } from "../features/auth/authSlice";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(adminLoginUser({ email, password }));
    if (adminLoginUser.fulfilled.match(result)) {
      toast.success("Admin login successful!");
      const loggedUserRole = String(result.payload.user?.role || "").toUpperCase();
      if (loggedUserRole === "ADMIN" || loggedUserRole === "SUPER_ADMIN") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="glass-card p-8 shadow-2xl border border-indigo-500/30">
        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-400">Admin Portal Login</h2>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input"
              placeholder="Enter admin email address (e.g., admin@busticket.com)"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Admin Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-xl glass-input text-xs font-bold"
                placeholder="Enter admin password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Hide Password" : "Show Password"}
                aria-label={showPassword ? "Hide Password" : "Show Password"}
                className="absolute right-3 text-slate-400 hover:text-white cursor-pointer transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-indigo-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {loading ? "Authenticating..." : "Login to Admin Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
