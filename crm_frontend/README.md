# CRM Frontend

A minimal React frontend scaffolded with Vite, TailwindCSS, and Framer Motion.

- Framework: React 18 + Vite 5
- Styling: TailwindCSS (Heritage Brown theme)
- Animations: Framer Motion
- Port: 3000 (dev and preview)
- No references to any `crm_database/db_visualizer` path.

## Environment variables

Copy `.env.example` to `.env` and set:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

These are compile-time variables in Vite. Build the image again if you change them.

## Local development

```
npm install
npm run dev
```

Then open http://localhost:3000

## Production build

```
npm run build
npm run start
```

This runs `vite preview` serving the built `dist` on port 3000.

## Docker

Build:

```
docker build -t crm-frontend:latest .
```

Run:

```
docker run --rm -p 3000:3000 crm-frontend:latest
```

Open http://localhost:3000

## Health check demo

The home view performs an optional GET to `${VITE_API_BASE_URL}/health`. If the backend is not running, it will show as unreachable. This is purely informational and does not block the UI.

## Notes

- This container is standalone and does not reference any `crm_database/db_visualizer` directories or scripts.
- All configuration is via `.env` (Vite envs) and Docker build-time configuration.
