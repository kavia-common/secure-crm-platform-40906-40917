import React from "react";
import { render, screen } from "@testing-library/react";
import { AppProviders } from "../app/AppProviders";
import ServiceRequestForm from "./ServiceRequestForm";

test("ServiceRequestForm renders under AppProviders without crashing", async () => {
  render(
    <AppProviders>
      <ServiceRequestForm />
    </AppProviders>
  );
  const heading = await screen.findByRole("heading", { name: /Create Service Request/i });
  expect(heading).toBeInTheDocument();
});
