import React from "react";
import { AppProviders } from "./app/AppProviders";
import { AppRoutes } from "./app/Routes";
import { ErrorBoundary } from "./app/ErrorBoundary";

/**
 * PUBLIC_INTERFACE
 * App root mounting providers and routes with global error boundary.
 */
export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AppProviders>
  );
}
