import React from "react";

/**
 * PUBLIC_INTERFACE
 * Tabs: simple tabs with accessible tablist and roving selection.
 */
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div>
      <div role="tablist" aria-label="Tabs" style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(17,24,39,.12)" }}>
        {tabs.map((t) => {
          const selected = t.value === active;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.value}`}
              id={`tab-${t.value}`}
              onClick={() => onChange?.(t.value)}
              style={{
                border: "none",
                background: "transparent",
                padding: "10px 12px",
                borderBottom: selected ? "3px solid var(--color-primary)" : "3px solid transparent",
                fontWeight: selected ? 700 : 600,
                cursor: "pointer",
                color: "var(--color-text)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) =>
        t.value === active ? (
          <div
            key={t.value}
            role="tabpanel"
            id={`panel-${t.value}`}
            aria-labelledby={`tab-${t.value}`}
            style={{ paddingTop: 12 }}
          >
            {t.content}
          </div>
        ) : null
      )}
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Badge: small label with tone variant.
 */
export function Badge({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "rgba(17,24,39,.06)", color: "var(--color-text)" },
    primary: { bg: "var(--color-secondary)", color: "var(--color-primary)" },
    success: { bg: "rgba(5,150,105,.12)", color: "var(--color-success)" },
    danger: { bg: "rgba(220,38,38,.12)", color: "var(--color-error)" },
  };
  const s = map[tone] || map.neutral;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {children}
    </span>
  );
}

/**
 * PUBLIC_INTERFACE
 * Avatar: circular initials or image fallback.
 */
export function Avatar({ name = "U", src, size = 28 }) {
  const initial = (name || "U").slice(0, 1).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", background: "var(--color-secondary)" }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-secondary)",
        color: "var(--color-primary)",
        fontWeight: 700,
      }}
    >
      {initial}
    </span>
  );
}

/**
 * PUBLIC_INTERFACE
 * StatusPill: semantic indicator for statuses.
 */
export function StatusPill({ status }) {
  const tone =
    status === "Open"
      ? "primary"
      : status === "Closed"
      ? "success"
      : status === "Overdue"
      ? "danger"
      : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
