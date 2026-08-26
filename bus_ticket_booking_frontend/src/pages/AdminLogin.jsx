import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { adminLoginUser } from "../features/auth/authSlice";

export const AdminLogin = () => {
  const [email, setEmail] = useState("admin@busticket.com");
  const [password, setPassword] = useState("Admin@123456");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(adminLoginUser({ email, password }));
    if (adminLoginUser.fulfilled.match(result)) {
      navigate("/admin");
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
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input"
              required
            />
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
