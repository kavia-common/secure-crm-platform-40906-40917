import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import "./toast.css";

/**
 * Toast context carries both the push API and the current list of toasts for the viewport.
 */
const ToastCtx = createContext(null);

// PUBLIC_INTERFACE
export function useToast() {
  /** Provides access to toast.push(tone) API. In dev/test, returns a no-op with a warning if provider is missing. */
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Dev-safety: don't crash the entire app if provider is missing in development/test.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[Toast] useToast called without a mounted <ToastProvider>. Returning a no-op implementation."
      );
      return {
        push: (msg, tone = "info") =>
          // eslint-disable-next-line no-console
          console.warn(`[Toast] (${tone})`, msg, "(no provider mounted)"),
      };
    }
    // Production: throw to surface misconfiguration early
    throw new Error("useToast must be used within ToastProvider");
  }
  return { push: ctx.push };
}

/**
 * PUBLIC_INTERFACE
 * ToastArea renders the visual toast viewport. It expects to be placed inside ToastProvider.
 */
export function ToastArea() {
  const ctx = useContext(ToastCtx) || { toasts: [], remove: () => {} };
  const { toasts, remove } = ctx;

  return (
    <div className="toast-area" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.tone}`}
          role="status"
          onClick={() => remove(t.id)}
          title="Click to dismiss"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * ToastProvider wraps the app tree with Toast context and renders a ToastArea overlay.
 * It guarantees that any descendant can call useToast().push(...) without crashing.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    const timers = timersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((msg, tone = "info", options = {}) => {
    const id = Math.random().toString(36).slice(2);
    const duration = typeof options.duration === "number" ? options.duration : 4000;

    setToasts((t) => [...t, { id, msg, tone }]);

    // Auto-dismiss with a cancellable timeout
    const timer = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, timer);

    return id;
  }, [remove]);

  const value = useMemo(
    () => ({
      toasts,
      push,
      remove,
    }),
    [toasts, push, remove]
  );

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastArea />
    </ToastCtx.Provider>
  );
}
