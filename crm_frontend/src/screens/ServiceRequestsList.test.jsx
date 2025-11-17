import React from "react";
import { render, screen } from "@testing-library/react";
import { AppProviders } from "../app/AppProviders";
import ServiceRequestsList from "./ServiceRequestsList";

// PUBLIC_INTERFACE
test("ServiceRequestsList mounts and shows heading", async () => {
  render(
    <AppProviders>
      <ServiceRequestsList />
    </AppProviders>
  );
  // Heading should be present
  const heading = await screen.findByRole("heading", { name: /Service Requests/i });
  expect(heading).toBeInTheDocument();
});
