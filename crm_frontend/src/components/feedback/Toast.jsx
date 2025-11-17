import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import "./toast.css";

const ToastCtx = createContext(null);

/**
 * PUBLIC_INTERFACE
 * useToast to push toast messages.
 */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastArea");
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * ToastArea renders toasts and provides add/remove API via context.
 */
export function ToastArea() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      <div className="toast-area" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role="status">
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * ToastProvider alias to mount ToastArea within other providers.
 */
export function ToastProvider({ children }) {
  // We render children and ToastArea to make toasts globally available
  return (
    <>
      {children}
      <ToastArea />
    </>
  );
}
