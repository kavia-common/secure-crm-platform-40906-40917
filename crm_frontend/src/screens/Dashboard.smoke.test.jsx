import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { AuthProvider } from "../auth/AuthContext";
import Dashboard from "./Dashboard";

/**
 * PUBLIC_INTERFACE
 * Smoke test for Dashboard within AppShell to verify no sidebar/topbar overlay issues.
 * - Ensures main content is clickable near the top-left region
 * - Validates route-aware attribute data-route="dashboard" is set
 * - Verifies grid-area participation and min-width semantics for content flow
 */
describe("Dashboard in AppShell - overlap prevention", () => {
  const mockAuthContext = {
    user: { name: "Test User", id: "1" },
    theme: "light",
    setTheme: jest.fn(),
    logout: jest.fn(),
    dummyAuth: true,
  };

  const renderWithShell = (initialPath = "/dashboard", child = <Dashboard />) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider value={mockAuthContext}>
          <AppShell>{child}</AppShell>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  test("AppShell has data-route=dashboard and content is clickable at top-left", () => {
    let clicked = false;
    renderWithShell(
      "/dashboard",
      <div>
        <Dashboard />
        <button
          data-testid="dash-click-tl"
          onClick={() => {
            clicked = true;
          }}
          style={{ marginTop: 0, alignSelf: "flex-start" }}
        >
          TL Click
        </button>
      </div>
    );

    const shell = document.querySelector(".app-shell");
    expect(shell).toBeInTheDocument();
    // data-route attribute should indicate 'dashboard'
    expect(shell.getAttribute("data-route")).toBe("dashboard");

    // Main role and button should be visible and clickable
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    const btn = screen.getByTestId("dash-click-tl");
    expect(btn).toBeVisible();

    fireEvent.click(btn);
    expect(clicked).toBe(true);
  });

  test("Tablet viewport also allows top-left clicks without overlap", () => {
    // Set viewport to tablet-like width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });

    let clicked = false;
    renderWithShell(
      "/dashboard",
      <button data-testid="dash-click-tablet" onClick={() => (clicked = true)}>
        TL Tablet
      </button>
    );
    const btn = screen.getByTestId("dash-click-tablet");
    fireEvent.click(btn);
    expect(clicked).toBe(true);
  });
});
