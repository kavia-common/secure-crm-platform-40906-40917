import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app shell brand", async () => {
  render(<App />);
  const brand = await screen.findByText(/Kavia CRM/i);
  expect(brand).toBeInTheDocument();
});
