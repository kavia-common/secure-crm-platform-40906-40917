import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AppShell } from "./AppShell";

/**
 * Smoke test for AppShell navigation sidebar
 * Verifies basic functionality in a near-production setup
 */
describe("AppShell Smoke Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("smoke: sidebar renders and toggle works", () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <div data-testid="main-content">Test Content</div>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify main elements render
    expect(screen.getByText(/Kavia CRM/i)).toBeInTheDocument();
    expect(screen.getByTestId("main-content")).toBeInTheDocument();

    // Verify navigation items
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /service requests/i })).toBeInTheDocument();

    // Test toggle
    const toggleBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    fireEvent.click(toggleBtn);
    
    expect(toggleBtn).toHaveAttribute("aria-label", "Expand sidebar");
  });

  test("smoke: active link highlighting works", () => {
    // Simulate being on dashboard
    window.history.pushState({}, "Dashboard", "/dashboard");

    render(
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <div>Dashboard</div>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    );

    const dashLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashLink).toHaveClass("active");
  });

  test("smoke: localStorage persistence works", () => {
    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    );

    const toggleBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    fireEvent.click(toggleBtn);

    expect(localStorage.getItem("ui_sidebar_open")).toBe("0");

    // Unmount and remount to simulate page refresh
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    );

    // Should remember collapsed state
    const newToggleBtn = screen.getByRole("button", { name: /expand sidebar/i });
    expect(newToggleBtn).toHaveAttribute("aria-expanded", "false");
  });
});
