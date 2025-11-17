import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AppShell } from "./AppShell";

/**
 * PUBLIC_INTERFACE
 * Tests for topbar-only AppShell: verifies header, nav links, theme toggle and logout presence.
 */
function Wrapper({ children, initialPath = "/dashboard", ctxOverrides = {} }) {
  const baseCtx = {
    theme: "light",
    setTheme: jest.fn(),
    user: { name: "Test User" },
    logout: jest.fn(),
    dummyAuth: true,
  };
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider value={{ ...baseCtx, ...ctxOverrides }}>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe("AppShell (Topbar-only) Layout", () => {
  test("renders topbar and main content", () => {
    render(
      <Wrapper>
        <AppShell>
          <div data-testid="content">Dashboard Content</div>
        </AppShell>
      </Wrapper>
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  test("renders primary navigation links in topbar", () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );
    const expected = [
      { name: /dashboard/i, href: "/dashboard" },
      { name: /customers/i, href: "/customers" },
      { name: /service requests/i, href: "/service-requests" },
      { name: /complaints/i, href: "/complaints" },
      { name: /settings/i, href: "/settings" },
    ];
    for (const item of expected) {
      const link = screen.getByRole("link", { name: item.name });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  test("theme toggle calls setTheme", () => {
    const setTheme = jest.fn();
    render(
      <Wrapper ctxOverrides={{ setTheme, theme: "light", dummyAuth: false }}>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(toggle);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  test("logout is clickable", () => {
    const logout = jest.fn();
    render(
      <Wrapper ctxOverrides={{ logout }}>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(logout).toHaveBeenCalled();
  });
});
