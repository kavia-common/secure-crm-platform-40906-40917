import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AppShell } from "./AppShell";

function Wrapper({ children, initialPath = "/dashboard" }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider value={{ theme: "light", setTheme: () => {}, user: { name: "Test User" }, logout: () => {} }}>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AppShell Navigation Sidebar", () => {
  beforeEach(() => {
    // Clean localStorage before each test
    try {
      localStorage.clear();
    } catch {}
  });

  test("highlights active route and sets aria-current=page", async () => {
    render(
      <Wrapper initialPath="/dashboard">
        <AppShell>
          <div data-testid="content">Dashboard Content</div>
        </AppShell>
      </Wrapper>
    );

    const dashLink = await screen.findByRole("link", { name: /dashboard/i });
    expect(dashLink).toBeInTheDocument();
    
    // Active link should have aria-current="page" for accessibility
    expect(dashLink).toHaveAttribute("aria-current", "page");
    
    // Should also have active class for styling
    expect(dashLink.className).toMatch(/active/);
  });

  test("collapse/expand persists state in localStorage", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    // Initially should be open (default)
    const toggleBtn = await screen.findByRole("button", { name: /collapse sidebar/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(toggleBtn).toHaveAttribute("aria-label", "Expand sidebar");
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      expect(localStorage.getItem("ui_sidebar_open")).toBe("0");
    });

    // Click to expand again
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(toggleBtn).toHaveAttribute("aria-label", "Collapse sidebar");
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      expect(localStorage.getItem("ui_sidebar_open")).toBe("1");
    });
  });

  test("toggle button responds to Enter and Space keys", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    const toggleBtn = await screen.findByRole("button", { name: /collapse sidebar/i });
    
    // Press Space key
    fireEvent.keyDown(toggleBtn, { key: " ", code: "Space" });
    
    await waitFor(() => {
      expect(toggleBtn).toHaveAttribute("aria-label", "Expand sidebar");
    });

    // Press Enter key
    fireEvent.keyDown(toggleBtn, { key: "Enter", code: "Enter" });
    
    await waitFor(() => {
      expect(toggleBtn).toHaveAttribute("aria-label", "Collapse sidebar");
    });
  });

  test("ESC key closes the sidebar and returns focus", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    const toggleBtn = await screen.findByRole("button", { name: /collapse sidebar/i });
    
    // Ensure sidebar is open
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Press ESC key
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    });
  });

  test("all navigation links render with correct paths", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    // Verify all expected nav items are present
    const expectedItems = [
      { name: /dashboard/i, href: "/dashboard" },
      { name: /customers/i, href: "/customers" },
      { name: /service requests/i, href: "/service-requests" },
      { name: /omnichannel inbox/i, href: "/omnichannel" },
      { name: /complaints/i, href: "/complaints" },
      { name: /settings/i, href: "/settings" },
    ];

    for (const item of expectedItems) {
      const link = await screen.findByRole("link", { name: item.name });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  test("navigation links have proper ARIA labels", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    const dashLink = await screen.findByRole("link", { name: /dashboard/i });
    expect(dashLink).toHaveAttribute("aria-label", "Dashboard");
    expect(dashLink).toHaveAttribute("title", "Dashboard");
  });

  test("sidebar has proper ARIA attributes", async () => {
    render(
      <Wrapper>
        <AppShell>
          <div />
        </AppShell>
      </Wrapper>
    );

    const sidebar = document.getElementById("primary-sidebar");
    expect(sidebar).toHaveAttribute("aria-label", "Primary navigation");
  });

  test("theme toggle button works correctly", async () => {
    const mockSetTheme = jest.fn();
    
    render(
      <MemoryRouter>
        <AuthProvider value={{ theme: "light", setTheme: mockSetTheme, user: { name: "Test" }, logout: () => {} }}>
          <AppShell>
            <div />
          </AppShell>
        </AuthProvider>
      </MemoryRouter>
    );

    const themeBtn = await screen.findByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  test("logout button is accessible and clickable", async () => {
    const mockLogout = jest.fn();
    
    render(
      <MemoryRouter>
        <AuthProvider value={{ theme: "light", setTheme: () => {}, user: { name: "Test" }, logout: mockLogout }}>
          <AppShell>
            <div />
          </AppShell>
        </AuthProvider>
      </MemoryRouter>
    );

    const logoutBtn = await screen.findByRole("button", { name: /logout/i });
    expect(logoutBtn).toBeInTheDocument();
    
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });
});
