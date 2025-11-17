import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../auth/AuthContext";
import { AppShell } from "../layout/AppShell";

const Login = lazy(() => import("../screens/AuthLogin"));
const Dashboard = lazy(() => import("../screens/Dashboard"));
const Customer360 = lazy(() => import("../screens/Customer360"));
const SRForm = lazy(() => import("../screens/ServiceRequestForm"));
const SRDetail = lazy(() => import("../screens/ServiceRequestDetail"));
const Inbox = lazy(() => import("../screens/OmniChannelInbox"));
const Complaints = lazy(() => import("../screens/Complaints"));
const Settings = lazy(() => import("../screens/Settings"));

/**
 * PUBLIC_INTERFACE
 * AppRoutes declares all app routes and protected sections.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppShell>
                <Outlet />
              </AppShell>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customer360 />} />
            <Route path="/service-requests" element={<SRForm />} />
            <Route path="/service-requests/:id" element={<SRDetail />} />
            <Route path="/omnichannel" element={<Inbox />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}


