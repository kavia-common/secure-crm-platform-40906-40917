import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders layout chrome: Sidebar, TopBar, main content.
 * Enhancements:
 * - Active route highlighting via NavLink isActive
 * - Collapse/expand with persisted state (localStorage: ui_sidebar_open)
 * - Responsive mobile drawer with overlay and ESC to close
 * - Keyboard accessibility and ARIA attributes
 * - Hover/focus styles aligned with theme tokens
 */
export function AppShell({ children }) {
  const { logout, user, theme, setTheme, dummyAuth } = useAuth();
  const location = useLocation();

  // Determine initial open state: prefer persisted value; if none, closed on mobile, open on desktop.
  const initialOpen = useMemo(() => {
    try {
      const persisted = localStorage.getItem("ui_sidebar_open");
      if (persisted !== null) return persisted === "1";
      if (typeof window !== "undefined") return window.innerWidth >= 768;
      return true;
    } catch {
      return true;
    }
  }, []);

  const [open, setOpen] = useState(initialOpen);

  // Persist open state
  useEffect(() => {
    try {
      localStorage.setItem("ui_sidebar_open", open ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [open]);

  // Close the mobile drawer on route change
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (open && isMobile) setOpen(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close (mainly for mobile drawer)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleSidebar = () => setOpen((v) => !v);

  // Primary nav items with icons (emoji placeholders to avoid external deps)
  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
      { to: "/customers", label: "Customer 360", icon: "👥" },
      { to: "/service-requests", label: "Service Requests", icon: "📝" },
      { to: "/omnichannel", label: "Omni-Channel Inbox", icon: "📨" },
      { to: "/complaints", label: "Complaints", icon: "⚠️" },
      { to: "/settings", label: "Settings", icon: "⚙️" },
    ],
    []
  );

  return (
    <div className={clsx("shell", open ? "sidebar-open" : "sidebar-closed")}>
      {/* Mobile backdrop for drawer mode */}
      <div
        className={clsx("backdrop", open && "show")}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <aside
        id="primary-sidebar"
        className={clsx("sidebar", open ? "open" : "closed")}
        aria-label="Primary"
      >
        <div className="brand">
          <Link to="/" aria-label="Kavia CRM Home">
            <span className="dot" aria-hidden="true" /> Kavia CRM
          </Link>
        </div>
        <nav aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact || false}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) => clsx("nav", isActive && "active")}
            >
              <span className="icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            className="iconbtn"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={open}
            aria-controls="primary-sidebar"
            onClick={toggleSidebar}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggleSidebar();
              }
            }}
          >
            ☰
          </button>
          <div className="grow" />
          <button
            className="seg"
            onClick={() => setTheme?.(theme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {dummyAuth ? (
            <span
              aria-label="Demo mode indicator"
              title="Demo mode: authentication is mocked"
              style={{
                marginLeft: 8,
                marginRight: 8,
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: 999,
                background: "var(--color-secondary)",
                color: "var(--color-primary)",
                border: "1px dashed rgba(17,24,39,.2)",
              }}
            >
              Demo mode
            </span>
          ) : null}
          <div className="user" role="group" aria-label="User">
            <span className="avatar" aria-hidden="true">
              {user?.name?.[0] || "U"}
            </span>
            <span aria-label="User name">{user?.name || "Unknown"}</span>
            <button className="seg" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
