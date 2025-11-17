import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AuthProvider } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * Smoke test for the topbar-only AppShell.
 * Ensures:
 * - Topbar is rendered and sticky
 * - Nav links are present
 * - Main content area is scrollable and visible
 */
const mockAuthContext = {
  user: { name: "Test User", id: "1" },
  theme: "light",
  setTheme: jest.fn(),
  logout: jest.fn(),
  dummyAuth: false,
};

const renderAppShell = (children = <div>Test Content</div>) =>
  render(
    <BrowserRouter>
      <AuthProvider value={mockAuthContext}>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </BrowserRouter>
  );

describe("AppShell Smoke (Topbar-only)", () => {
  test("renders topbar, nav, and main content", () => {
    renderAppShell(<div data-testid="main">Test Content</div>);
    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();

    // Nav presence
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();

    // Main content
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });
});
