import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, Sparkles, Gift, Info } from "lucide-react";

export const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet/balance");
      setBalance(res.data.data.balance || 0);
      const txRes = await api.get("/wallet/transactions");
      setTransactions(txRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
          <WalletIcon className="w-7 h-7 text-emerald-400" /> RedBus Wallet
        </h1>
        <p className="text-xs text-slate-400 mt-1">Instant ticket discounts, 100% refund safety & referral rewards</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Available Wallet Balance</span>
          <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">₹{parseFloat(balance).toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Verified RedBus Reward Credits
          </div>
        </div>

        {/* Policy Info Badge (In place of Add Money) */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 max-w-sm space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
            <Gift className="w-4 h-4 text-emerald-400" /> Earned Wallet Funds Only
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Direct manual topups are disabled. Wallet credits are earned exclusively via <strong className="text-emerald-300">Referral Rewards (₹500 per signup)</strong> and <strong className="text-emerald-300">Ticket Cancellation Refunds</strong>.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Wallet Activity & Transaction Ledger
        </h2>

        {transactions.length > 0 ? (
          <div className="space-y-2.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${tx.type === "CREDIT" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                    {tx.type === "CREDIT" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm">{tx.description || (tx.type === "CREDIT" ? "Referral Bonus / Refund" : "Ticket Booking Discount")}</div>
                    <div className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className={`text-base font-black ${tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.type === "CREDIT" ? "+" : "-"}₹{parseFloat(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">No referral rewards or refund transactions recorded yet.</div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
