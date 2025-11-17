import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ProtectedRoute, DUMMY_AUTH } from "../auth/AuthContext";
import { AppShell } from "../layout/AppShell";

const Login = lazy(() => import("../screens/AuthLogin"));
const Dashboard = lazy(() => import("../screens/Dashboard"));
const CustomersList = lazy(() => import("../screens/CustomersList"));
const Customer360 = lazy(() => import("../screens/Customer360"));
const CustomerDetail = lazy(() => import("../screens/CustomerDetailView"));
const SRForm = lazy(() => import("../screens/ServiceRequestForm"));
const SRDetail = lazy(() => import("../screens/ServiceRequestDetail"));
const SRDetailView = lazy(() => import("../screens/ServiceRequestDetailView"));
const SRList = lazy(() => import("../screens/ServiceRequestsList"));
const Inbox = lazy(() => import("../screens/OmniChannelInbox"));
const ComplaintsList = lazy(() => import("../screens/ComplaintsList"));
const ComplaintDetail = lazy(() => import("../screens/ComplaintDetailView"));
const Settings = lazy(() => import("../screens/Settings"));

/**
 * PUBLIC_INTERFACE
 * AppRoutes declares all app routes and protected sections.
 * All routes now properly aligned with sidebar navigation:
 * - /dashboard → Dashboard
 * - /customers → CustomersList (primary customer view)
 * - /customers/:id → CustomerDetailView (individual customer detail view)
 * - /service-requests → ServiceRequestsList
 * - /service-requests/new → ServiceRequestForm
 * - /service-requests/:id → ServiceRequestDetailView (individual SR detail view)
 * - /omnichannel → OmniChannelInbox
 * - /complaints → ComplaintsList
 * - /complaints/:id → ComplaintDetailView (individual complaint detail view)
 * - /settings → Settings
 * Detail views support API and demo fallback with real-time updates via eventBus.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        {DUMMY_AUTH ? (
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        ) : (
          <Route path="/login" element={<Login />} />
        )}
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
            <Route path="/customers" element={<CustomersList />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/service-requests" element={<SRList />} />
            <Route path="/service-requests/new" element={<SRForm />} />
            <Route path="/service-requests/:id" element={<SRDetailView />} />
            <Route path="/omnichannel" element={<Inbox />} />
            <Route path="/complaints" element={<ComplaintsList />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
