import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders layout chrome: Sidebar, TopBar, main content.
 * - Grid layout with explicit areas: header(topbar), sidebar, main
 * - Data attributes for CSS targeting: data-viewport, data-collapsed, data-drawer
 * - Sticky topbar; sticky sidebar on tablet/desktop; fixed drawer on mobile
 * - Overlay and z-index: overlay(40) > sidebar(30 in drawer) > topbar(20) > content(0)
 * - Responsive breakpoints: mobile <640px (drawer), tablet 640–1023px (inline collapsible), desktop ≥1024px
 * - Collapsed state persisted per viewport mode in localStorage
 * - Keyboard accessibility (Enter/Space toggle, ESC closes on mobile) and focus management
 */
export function AppShell({ children }) {
  const { logout, user, theme, setTheme, dummyAuth } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const lastFocusRef = useRef(null);

  const getViewportMode = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  };

  const collapsedKeyForMode = (mode) => `ui_sidebar_collapsed_${mode}`;

  // Determine initial viewport mode and collapsed state (allow SSR)
  const initialMode = getViewportMode();
  const [viewportMode, setViewportMode] = useState(initialMode);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const persisted = localStorage.getItem(collapsedKeyForMode(initialMode));
      if (persisted !== null) return persisted === "1";
    } catch {
      // ignore storage read failures
    }
    return initialMode === "mobile"; // default collapsed on mobile
  });

  // Persist collapsed state (per-viewport) and keep legacy keys updated
  useEffect(() => {
    try {
      localStorage.setItem(
        collapsedKeyForMode(viewportMode),
        collapsed ? "1" : "0"
      );
      // Legacy keys: maintain for backward compatibility
      localStorage.setItem("ui_sidebar_collapsed", collapsed ? "1" : "0");
      localStorage.setItem("ui_sidebar_open", collapsed ? "0" : "1");
    } catch {
      // ignore storage failures
    }
  }, [collapsed, viewportMode]);

  // Handle window resize to update viewport mode
  useEffect(() => {
    const handleResize = () => {
      setViewportMode(getViewportMode());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also recalibrate viewport mode on route change (for consistency)
  useEffect(() => {
    setViewportMode(getViewportMode());
  }, [location.pathname]);

  // When viewport mode changes, adopt persisted state for that mode (or default)
  useEffect(() => {
    try {
      const persisted = localStorage.getItem(collapsedKeyForMode(viewportMode));
      if (persisted !== null) {
        setCollapsed(persisted === "1");
      } else {
        setCollapsed(viewportMode === "mobile");
      }
    } catch {
      setCollapsed(viewportMode === "mobile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportMode]);

  // Close the mobile drawer on route change
  useEffect(() => {
    if (viewportMode === "mobile" && !collapsed) {
      setCollapsed(true);
      // Return focus to toggle button after closing on mobile
      if (toggleBtnRef.current) {
        setTimeout(() => toggleBtnRef.current?.focus(), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ESC to close drawer on mobile
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !collapsed && viewportMode === "mobile") {
        setCollapsed(true);
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
        const firstNavLink = sidebarRef.current?.querySelector("a[href]");
        if (firstNavLink) firstNavLink.focus();
      }, 100);
    } else if (newCollapsed && toggleBtnRef.current) {
      // When closing, return focus to toggle button
      toggleBtnRef.current.focus();
    }
  };

  // Navigation items
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

  const isDrawerMode = viewportMode === "mobile";

  return (
    <div
      className={clsx("app-shell")}
      data-collapsed={collapsed ? "true" : "false"}
      data-drawer={isDrawerMode ? "true" : "false"}
      data-viewport={viewportMode}
    >
      {/* Mobile backdrop for drawer mode (does not cover sidebar area when open) */}
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

      {/* Topbar occupies its own grid row */}
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

      <main className="main" role="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
