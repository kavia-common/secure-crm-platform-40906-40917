# KAVIA CRM Frontend

React application implementing CRM UI with a lightweight component library, RHF + Zod validations, server-side tables, charts, modals/drawers, and WebSocket hooks.

## Quick Start

- `npm start` — dev server at http://localhost:3000
- `npm test` — tests
- `npm run build` — production build

## Environment

Create `.env` with:
- REACT_APP_API_BASE=/api
- REACT_APP_WS_URL=ws://localhost:3001

See `.env.example` in repo root of the overall project for patterns if present. Do not commit secrets.

## Components Overview

- Forms: `Input`, `Select`, `TextArea`, `DatePicker` (src/components/forms/Controls.jsx)
- Overlays: `Modal`, `Drawer` (src/components/overlays/Overlays.jsx)
- Data: `DataTable`, `Pagination`, `useServerTable` (src/components/data/Table.jsx)
- Primitives: `Button`, `Tabs`, `Badge`, `Avatar`, `StatusPill`
- Feedback: `ToastArea` / `useToast`
- Charts: `LineChartCard`, `BarChartCard` (Recharts)

Example:

```jsx
import { useForm } from "react-hook-form";
import { Input, Select } from "@/components/forms/Controls";
import { Modal } from "@/components/overlays/Overlays";
```

## Screens

- Dashboard: charts + KPIs with WS updates
- Customer 360: server-side table, quick filter
- Service Requests: form with Zod validation, modal confirm
- SR Detail: tabs + activity table
- Omni-Channel Inbox: live WS messages grouped by channel
- Complaints: server-side table
- Settings: Drawer demo

## Accessibility

- All interactive elements have roles/aria attributes
- Keyboard accessible modals/drawers
- Focus outlines via theme tokens
