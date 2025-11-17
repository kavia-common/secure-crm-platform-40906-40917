import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders a simple, responsive layout with a sticky Topbar and a single-column main content area.
 * - No sidebar: no reserved space or overlapping layers; content uses full width.
 * - Topbar includes compact navigation links for primary routes.
 * - Accessible keyboard/ARIA, responsive header with a small mobile menu.
 */
export function AppShell({ children }) {
  const { logout, user, theme, setTheme, dummyAuth } = useAuth();
  const location = useLocation();

  // Topbar navigation items
  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/customers", label: "Customers" },
      { to: "/service-requests", label: "Service Requests" },
      { to: "/complaints", label: "Complaints" },
      { to: "/settings", label: "Settings" },
    ],
    []
  );

  // route key for optional CSS hooks
  const routeKey = React.useMemo(() => {
    const path = location.pathname || "/";
    const seg = path.split("/").filter(Boolean)[0] || "root";
    return seg.toLowerCase();
  }, [location.pathname]);

  return (
    <div className={clsx("app-shell")} data-route={routeKey} data-layout="topbar-only">
      <header className="topbar" role="banner">
        <div className="brand">
          <span className="dot" aria-hidden="true" />
          <span className="brand-text">Kavia CRM</span>
        </div>

        <nav className="topnav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) => clsx("topnav-link", isActive && "active")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

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
            className="demo-pill"
          >
            Demo mode
          </span>
        ) : null}

        <div className="user" role="group" aria-label="User menu">
          <span className="avatar" aria-hidden="true">
            {user?.name?.[0] || "U"}
          </span>
          <span aria-label="User name">{user?.name || "Unknown"}</span>
          <button className="seg" onClick={logout} aria-label="Logout">
            Logout
          </button>
        </div>
      </header>

      <main className="main" role="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
