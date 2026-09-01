import React, { useEffect, useState } from "react";
import walletApi from "../services/walletApi";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, Sparkles, Gift, RefreshCw } from "lucide-react";

export const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await walletApi.getBalance();
      setBalance(res.data?.data?.balance || 0);
      const txRes = await walletApi.getTransactions();
      setTransactions(txRes.data?.data || []);
    } catch (err) {
      console.error("Wallet loading error:", err);
    }
  };

  const getTxMeta = (tx) => {
    const isRefund = tx.source === "REFUND" || 
      (tx.referenceId && String(tx.referenceId).startsWith("REFUND-")) ||
      (tx.description && String(tx.description).toLowerCase().includes("refund"));

    if (tx.type === "CREDIT") {
      if (isRefund) {
        return {
          description: tx.description || `Refund of ₹${parseFloat(tx.amount).toFixed(2)} credited to wallet`,
          badgeText: "REFUND",
          badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        };
      }

      // In this system, all non-refund wallet credits are Referral Rewards
      return {
        description: `Referral Bonus: ₹${parseFloat(tx.amount).toFixed(0)} credited to wallet`,
        badgeText: "REFERRAL REWARD",
        badgeStyle: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
      };
    }

    return {
      description: tx.description || "Payment for Bus Booking",
      badgeText: "BOOKING",
      badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
          <WalletIcon className="w-7 h-7 text-emerald-400" /> RedBus Wallet
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Instant ticket discounts, referral rewards & cancellation refunds
        </p>
      </div>

      {/* Balance & Reward Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Available Balance Hero Card */}
        <div className="md:col-span-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 flex flex-col justify-between space-y-4 shadow-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Available Wallet Balance</span>
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">₹{parseFloat(balance).toFixed(2)}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Verified RedBus Wallet Credits
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-3">
            Use your wallet balance at checkout for instant discounts up to the configured maximum limit.
          </div>
        </div>

        {/* How Wallet Balance Increases Card */}
        <div className="md:col-span-6 glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4 bg-slate-950/80 flex flex-col justify-between">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">How Wallet Balance Increases</span>
            <span className="text-[10px] text-emerald-400 font-bold">Auto-Credited</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/20 flex items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-white">Referral Reward (+₹500)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Credited to your wallet when a friend registers using your code & completes their first booking.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/20 flex items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-white">Booking Cancellation Refund</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Refunds from cancelled tickets are credited directly back into your wallet balance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Wallet Activity & Transaction Ledger
        </h2>

        {transactions.length > 0 ? (
          <div className="space-y-2.5">
            {transactions.map((tx) => {
              const meta = getTxMeta(tx);
              return (
                <div key={tx.id} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${tx.type === "CREDIT" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                      {tx.type === "CREDIT" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {meta.description}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${meta.badgeStyle}`}>
                          {meta.badgeText}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`text-base font-black ${tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}₹{parseFloat(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">No wallet transactions recorded yet.</div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
