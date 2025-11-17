import React, { useEffect, useRef } from "react";

/**
 * PUBLIC_INTERFACE
 * Modal: accessible modal dialog with focus trap (basic) and ESC close.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      const prev = document.activeElement;
      ref.current?.focus();
      const onKey = (e) => {
        if (e.key === "Escape") onClose?.();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
        if (prev && prev.focus) prev.focus();
      };
    }
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 40,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        style={{
          background: "var(--color-surface)",
          color: "var(--color-text)",
          minWidth: 360,
          maxWidth: "90vw",
          width: 560,
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(17,24,39,.1)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <h2 id="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {title}
          </h2>
          <div style={{ marginLeft: "auto" }}>
            <button
              aria-label="Close dialog"
              onClick={onClose}
              style={{
                border: "1px solid rgba(17,24,39,.12)",
                background: "var(--color-surface)",
                borderRadius: 6,
                padding: "6px 8px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </header>
        <div style={{ padding: 16 }}>{children}</div>
        {footer ? (
          <footer
            style={{
              padding: 12,
              borderTop: "1px solid rgba(17,24,39,.1)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Drawer: side sheet from right.
 */
export function Drawer({ open, onClose, title, children, position = "right", width = 420 }) {
  if (!open) return null;
  const sideStyle =
    position === "left"
      ? { left: 0, borderRight: "1px solid rgba(17,24,39,.1)" }
      : { right: 0, borderLeft: "1px solid rgba(17,24,39,.1)" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        zIndex: 39,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          boxShadow: "var(--shadow-lg)",
          ...sideStyle,
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <header
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(17,24,39,.1)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h2 id="drawer-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {title}
          </h2>
          <div style={{ marginLeft: "auto" }}>
            <button
              aria-label="Close drawer"
              onClick={onClose}
              style={{
                border: "1px solid rgba(17,24,39,.12)",
                background: "var(--color-surface)",
                borderRadius: 6,
                padding: "6px 8px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </header>
        <div style={{ overflow: "auto", padding: 16 }}>{children}</div>
      </aside>
    </div>
  );
}
