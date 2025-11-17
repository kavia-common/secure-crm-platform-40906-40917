import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import "./appshell.css";

/**
 * PUBLIC_INTERFACE
 * AppShell renders a simple, responsive layout with a sticky Topbar and a single-column main content area.
 * - Desktop/tablet (>=640px): inline topbar navigation.
 * - Mobile (<640px): hamburger button that toggles an accessible mobile dropdown under the topbar.
 * Accessibility features:
 * - Hamburger has aria-controls, aria-expanded, keyboard activation (Enter/Space), and focus ring.
 * - Mobile menu uses role="menu" with role="menuitem" links and manages focus trapping while open.
 * - Closes on ESC and outside click/tap; restores focus to the hamburger when closed.
 * - Menu state is in-memory only; it closes on route change and window resize.
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

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleBtnRef = useRef(null);
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);

  // route key for optional CSS hooks
  const routeKey = useMemo(() => {
    const path = location.pathname || "/";
    const seg = path.split("/").filter(Boolean)[0] || "root";
    return seg.toLowerCase();
  }, [location.pathname]);

  const isMobile = () => window.matchMedia("(max-width: 639px)").matches;

  // Close menu and restore focus to hamburger toggle
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setTimeout(() => {
      toggleBtnRef.current?.focus();
    }, 0);
  }, []);

  // Handle keyboard activation of toggle (Enter/Space)
  const onToggleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMenuOpen((v) => !v);
    }
  }, []);

  // Global listeners for ESC, focus trap, and outside click when menu is open
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu();
      }
      // focus trap within menu
      if (e.key === "Tab" && menuRef.current) {
        const focusables = menuRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const handleClick = (e) => {
      const menuEl = menuRef.current;
      const toggleEl = toggleBtnRef.current;
      const target = e.target;
      if (!menuEl) return;
      if (!menuEl.contains(target) && (!toggleEl || !toggleEl.contains(target))) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("touchstart", handleClick, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("touchstart", handleClick, true);
    };
  }, [menuOpen, closeMenu]);

  // Close on route change to avoid stale open menu
  useEffect(() => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on resize to ensure in-memory only persistence
  useEffect(() => {
    const onResize = () => setMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Focus first item after menu opens on mobile
  useEffect(() => {
    if (menuOpen && isMobile()) {
      setTimeout(() => {
        firstItemRef.current?.focus();
      }, 0);
    }
  }, [menuOpen]);

  const navLinkClass = ({ isActive }) => clsx("topnav-link navlink", isActive && "active");

  return (
    <div
      className={clsx("app-shell")}
      data-route={routeKey}
      data-layout="topbar-only"
      data-menu-open={menuOpen ? "true" : "false"}
    >
      <header className="topbar" role="banner">
        {/* Hamburger toggle - visible on <640px via CSS */}
        <button
          ref={toggleBtnRef}
          type="button"
          className="hamburger"
          aria-label="Toggle navigation menu"
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          onKeyDown={onToggleKeyDown}
        >
          <span className="hamburger-box" aria-hidden="true">
            <span className="hamburger-inner" />
          </span>
        </button>

        <div className="brand">
          <span className="dot" aria-hidden="true" />
          <span className="brand-text">Kavia CRM</span>
        </div>

        {/* Desktop/Tablet inline nav */}
        <nav className="topnav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={navLinkClass}
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

      {/* Backdrop for mobile menu - click/tap to close */}
      <div className={clsx("menu-backdrop", menuOpen && "open")} aria-hidden={!menuOpen} />

      {/* Mobile dropdown under topbar */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={clsx("mobile-menu", menuOpen && "open")}
        role="menu"
        aria-label="Primary"
      >
        {navItems.map((item, idx) => (
          <NavLink
            key={`m-${item.to}`}
            to={item.to}
            end={item.to === "/dashboard"}
            className={navLinkClass}
            role="menuitem"
            tabIndex={menuOpen ? 0 : -1}
            ref={idx === 0 ? firstItemRef : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <main className="main content" role="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
