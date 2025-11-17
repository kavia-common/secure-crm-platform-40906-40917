# KAVIA CRM Frontend

React application implementing CRM UI with a lightweight component library, RHF + Zod validations, server-side tables, charts, modals/drawers, and WebSocket hooks.

## Quick Start

- `npm start` — dev server at http://localhost:3000
- `npm test` — tests
- `npm run build` — production build

## Environment

Create `.env` (see `.env.example`) with:
- REACT_APP_API_BASE=/api/v1
- REACT_APP_WS_URL=ws://localhost:3001
- REACT_APP_FEATURE_ENABLE_API=true
- REACT_APP_FEATURE_ENABLE_WS=true
- REACT_APP_FEATURE_DUMMY_AUTH=false

Notes:
- Demo mode is now OFF by default (no dummy auth). To enable demo UI without a backend, set `REACT_APP_FEATURE_DUMMY_AUTH=true`.
- When `REACT_APP_FEATURE_ENABLE_API=false`, HTTP requests are served by local mocks so UI works without backend (including auth: /auth/login, /auth/me, /auth/logout).
- When `REACT_APP_FEATURE_ENABLE_WS=false`, the WebSocket hook emits mock messages periodically and the in-app `eventBus` continues to work for local realtime updates.

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

- Dashboard: charts + KPIs with WS updates (and local event bus updates on transitions)
- Customers: list view with demo-mode data (local store) and API fallback; search + owner filter; route /customers
- Service Requests: form with Zod validation, modal confirm; List and Detail provide "Mark Resolved" action
- SR Detail: tabs + activity table + Resolve action button
- Omni-Channel Inbox: live WS messages grouped by channel
- Complaints: list view with demo-mode data (local store) and API fallback; search + status/priority filters; route /complaints; "Mark Closed" action
- Settings: Drawer demo

### Resolve/Close actions
- Service Requests list and detail have an action to "Mark Resolved". This calls:
  - PATCH {REACT_APP_API_BASE}/service-requests/{id}/transition with JSON `{ "to": "resolved" }`
  - Fallback: PATCH {REACT_APP_API_BASE}/service-requests/{id}/transition?status=Resolved
- Complaints list has an action to "Mark Closed". This calls:
  - PATCH {REACT_APP_API_BASE}/complaints/{id}/transition with JSON `{ "to": "closed" }`
  - Fallback: PATCH {REACT_APP_API_BASE}/complaints/{id} with JSON `{ "status": "Closed" }`

On success, an in-app event bus broadcasts:
- `sr:resolved` with the updated SR payload
- `complaint:closed` with the updated complaint payload

The Dashboard subscribes to these events to update KPI cards and status distribution in real time, without page reload.

If a WebSocket URL is configured and reachable (REACT_APP_WS_URL), backend events like `sr.resolved` / `complaint.closed` will also be bridged into the local event bus automatically.

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
