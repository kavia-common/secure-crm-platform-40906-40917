import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders layout chrome: Sidebar, TopBar, main content.
 */
export function AppShell({ children }) {
  const { logout, user, theme, setTheme, dummyAuth } = useAuth();
  const [open, setOpen] = useState(true);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : "closed"}`} aria-label="Primary">
        <div className="brand">
          <Link to="/"><span className="dot" aria-hidden="true" /> Kavia CRM</Link>
        </div>
        <nav aria-label="Main Navigation">
          <NavLink to="/dashboard" className="nav" end>Dashboard</NavLink>
          <NavLink to="/customers" className="nav">Customer 360</NavLink>
          <NavLink to="/service-requests" className="nav">Service Requests</NavLink>
          <NavLink to="/omnichannel" className="nav">Omni-Channel Inbox</NavLink>
          <NavLink to="/complaints" className="nav">Complaints</NavLink>
          <NavLink to="/settings" className="nav">Settings</NavLink>
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            className="iconbtn"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setOpen((v) => !v)}
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
            <span className="avatar" aria-hidden="true">{user?.name?.[0] || "U"}</span>
            <span aria-label="User name">{user?.name || "Unknown"}</span>
            <button className="seg" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
