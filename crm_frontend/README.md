# KAVIA CRM Frontend

React application implementing CRM UI with a lightweight component library, RHF + Zod validations, server-side tables, charts, modals/drawers, and WebSocket hooks.

## Quick Start

- `npm start` — dev server at http://localhost:3000
- `npm test` — tests
- `npm run build` — production build

## Environment

Create `.env` (see `.env.example`) with:
- REACT_APP_API_BASE=/api
- REACT_APP_WS_URL=ws://localhost:3001
- REACT_APP_FEATURE_ENABLE_API=true
- REACT_APP_FEATURE_ENABLE_WS=true

When `REACT_APP_FEATURE_ENABLE_API=false`, HTTP requests are served by local mocks so UI works without backend (including auth: /auth/login, /auth/me, /auth/logout).
When `REACT_APP_FEATURE_ENABLE_WS=false`, the WebSocket hook emits mock messages periodically.

Do not commit secrets.

## Login flow (frontend)
- The login screen uses React Hook Form + Zod validation.
- On submit it calls POST {REACT_APP_API_BASE}/auth/login with `{ username, password }` as per backend OpenAPI.
- On success tokens are persisted in localStorage and profile is fetched from GET {REACT_APP_API_BASE}/auth/me.
- Errors are displayed inline and the submit button shows a loading state.

## Components Overview

- Forms: `Input`, `Select`, `TextArea`, `DatePicker` (src/components/forms/Controls.jsx)
- Overlays: `Modal`, `Drawer` (src/components/overlays/Overlays.jsx)
- Data: `DataTable`, `Pagination`, `useServerTable` (src/components/data/Table.jsx)
- Primitives: `Button`, `Tabs`, `Badge`, `Avatar`, `StatusPill`
- Feedback: `ToastProvider` / `ToastArea` / `useToast`
- Charts: `LineChartCard`, `BarChartCard` (Recharts)

Example:

```jsx
import { useForm } from "react-hook-form";
import { Input, Select } from "@/components/forms/Controls";
import { Modal } from "@/components/overlays/Overlays";
```

## Screens

- Dashboard: charts + KPIs with WS updates
- Customers: list view with demo-mode data (local store) and API fallback; search + owner filter; route /customers
- Service Requests: form with Zod validation, modal confirm
- SR Detail: tabs + activity table
- Omni-Channel Inbox: live WS messages grouped by channel
- Complaints: list view with demo-mode data (local store) and API fallback; search + status/priority filters; route /complaints
- Settings: Drawer demo

## Demo data store

When running in demo mode (default: REACT_APP_FEATURE_DUMMY_AUTH=true), list screens for Service Requests, Customers, and Complaints read from an in-memory store with localStorage persistence. This enables a fully functional UI without a backend.

- Service Requests: src/services/demoStore.js (keys: demo_service_requests)
- Customers: src/services/demoStore.js (keys: demo_customers)
- Complaints: src/services/demoStore.js (keys: demo_complaints)

Behavior:
- Data is seeded deterministically on first load for Customers and Complaints.
- Tables support client-side search, filters, and sorting.
- Row clicks show a toast when details are not implemented yet.

When REACT_APP_FEATURE_DUMMY_AUTH=false, screens use API endpoints via useServerTable:
- GET {REACT_APP_API_BASE}/customers
- GET {REACT_APP_API_BASE}/complaints
On network or server error, a toast shows the endpoint and error status/message.

## Accessibility

- All interactive elements have roles/aria attributes
- Keyboard accessible modals/drawers
- Focus outlines via theme tokens
