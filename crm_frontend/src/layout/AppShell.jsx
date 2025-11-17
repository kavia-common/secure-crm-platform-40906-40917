import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders layout chrome: Sidebar, TopBar, main content.
 * Enhancements:
 * - Active route highlighting via NavLink isActive and aria-current
 * - Collapse/expand with persisted state (localStorage: ui_sidebar_collapsed)
 * - Responsive mobile drawer with overlay and ESC to close
 * - Keyboard accessibility (Enter/Space for toggle, Tab navigation, ESC closes drawer)
 * - Focus management when opening/closing drawer
 * - All menu items point to real routes matching Routes.jsx
 * - Proper ARIA attributes for screen readers
 * - Styles aligned with theme.css tokens
 * - Data attributes for CSS targeting: data-collapsed, data-drawer
 * - Window resize handler to update layout mode
 */
export function AppShell({ children }) {
  const { logout, user, theme, setTheme, dummyAuth } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const lastFocusRef = useRef(null);

  // Detect current viewport mode
  const [viewportMode, setViewportMode] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });

  // Determine initial collapsed state: prefer persisted value
  const initialCollapsed = useMemo(() => {
    try {
      const persisted = localStorage.getItem("ui_sidebar_collapsed");
      if (persisted !== null) return persisted === "1";
      // Default: collapsed on mobile, expanded on tablet/desktop
      return viewportMode === "mobile";
    } catch {
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("ui_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [collapsed]);

  // Handle window resize to update viewport mode
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      let mode = "desktop";
      if (w < 640) mode = "mobile";
      else if (w < 1024) mode = "tablet";
      setViewportMode(mode);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close the mobile drawer on route change (mobile only)
  useEffect(() => {
    if (viewportMode === "mobile" && !collapsed) {
      setCollapsed(true);
      // Return focus to toggle button after closing on mobile
      if (toggleBtnRef.current) {
        setTimeout(() => toggleBtnRef.current?.focus(), 100);
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close drawer (mainly for mobile)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !collapsed && viewportMode === "mobile") {
        setCollapsed(true);
        // Return focus to toggle button
        if (toggleBtnRef.current) {
          toggleBtnRef.current.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [collapsed, viewportMode]);

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    
    // Focus management
    if (!newCollapsed && viewportMode === "mobile") {
      // When opening on mobile, store the current focus and move focus to first nav link
      lastFocusRef.current = document.activeElement;
      setTimeout(() => {
        const firstNavLink = sidebarRef.current?.querySelector('a[href]');
        if (firstNavLink) firstNavLink.focus();
      }, 100);
    } else if (newCollapsed && toggleBtnRef.current) {
      // When closing, return focus to toggle button
      toggleBtnRef.current.focus();
    }
  };

  // Primary nav items with icons (emoji placeholders to avoid external deps)
  // All paths now match Routes.jsx exactly
  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
      { to: "/customers", label: "Customers", icon: "👥" },
      { to: "/service-requests", label: "Service Requests", icon: "📝" },
      { to: "/omnichannel", label: "OmniChannel Inbox", icon: "📨" },
      { to: "/complaints", label: "Complaints", icon: "⚠️" },
      { to: "/settings", label: "Settings", icon: "⚙️" },
    ],
    []
  );

  // Determine if drawer mode (mobile with overlay)
  const isDrawerMode = viewportMode === "mobile";

  return (
    <div 
      className={clsx("shell")} 
      data-collapsed={collapsed ? "true" : "false"}
      data-drawer={isDrawerMode ? "true" : "false"}
      data-viewport={viewportMode}
    >
      {/* Mobile backdrop for drawer mode */}
      {isDrawerMode && (
        <div
          className={clsx("backdrop", !collapsed && "show")}
          aria-hidden={collapsed}
          onClick={() => {
            setCollapsed(true);
            if (toggleBtnRef.current) {
              toggleBtnRef.current.focus();
            }
          }}
          role="presentation"
        />
      )}
      
      <aside
        id="primary-sidebar"
        ref={sidebarRef}
        className={clsx("sidebar")}
        aria-label="Primary navigation"
        aria-hidden={isDrawerMode && collapsed ? "true" : "false"}
      >
        <div className="brand">
          <Link to="/" aria-label="Kavia CRM Home">
            <span className="dot" aria-hidden="true" /> 
            <span className="brand-text">Kavia CRM</span>
          </Link>
        </div>
        <nav aria-label="Main Navigation" role="navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact || false}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) => clsx("nav", isActive && "active")}
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
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
        <header className="topbar" role="banner">
          <button
            ref={toggleBtnRef}
            className="iconbtn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
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
    </div>
  );
}
