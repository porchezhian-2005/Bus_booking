import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-bounce-short ${
              toast.type === "error"
                ? "bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/50"
                : toast.type === "info"
                ? "bg-sky-950/90 text-sky-200 border-sky-500/50 shadow-sky-950/50"
                : "bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              ) : toast.type === "info" ? (
                <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              )}
              <span className="text-xs font-bold leading-snug break-words">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white flex-shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log("Toast:", msg) };
  }
  return context;
};

export default ToastProvider;
