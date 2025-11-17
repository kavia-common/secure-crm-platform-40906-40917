import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AppShell } from "./AppShell";

function Wrapper({ children, initialPath = "/dashboard" }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider value={{ theme: "light", setTheme: () => {} }}>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

test("highlights active route and sets aria-current=page", async () => {
  render(
    <Wrapper initialPath="/dashboard">
      <AppShell>
        <div />
      </AppShell>
    </Wrapper>
  );

  const dashLink = await screen.findByRole("link", { name: /dashboard/i });
  expect(dashLink).toBeInTheDocument();
  // Active link should advertise current page for a11y
  expect(dashLink).toHaveAttribute("aria-current", "page");
  // We also add an 'active' class for styling
  expect(dashLink.className).toMatch(/active/);
});

test("collapse/expand persists state in localStorage", async () => {
  // Ensure clean initial state
  try { localStorage.removeItem("ui_sidebar_open"); } catch {}

  render(
    <Wrapper>
      <AppShell>
        <div />
      </AppShell>
    </Wrapper>
  );

  const toggle = await screen.findByRole("button", { name: /collapse sidebar/i });
  fireEvent.click(toggle);

  await waitFor(() => {
    expect(toggle).toHaveAttribute("aria-label", "Expand sidebar");
    expect(localStorage.getItem("ui_sidebar_open")).toBe("0");
  });
});
