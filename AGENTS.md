# AGENTS.md

## Project overview

FOODEX-2026 is a trade show report/CRM web app for FOODEX JAPAN 2026. It is a zero-dependency, vanilla HTML/JS frontend with two Vercel serverless API functions (`api/claude.js`, `api/data.js`) backed by a remote Supabase database. There is no build step, no test suite, no linter, and no `node_modules`.

## Cursor Cloud specific instructions

### Running the dev server

Run `node dev-server.mjs` from the repo root (or `npm run dev`). This serves the static frontend at `http://localhost:3000` and proxies `/api/*` routes to the serverless functions in `api/`.

### Environment variables

The API functions require these env vars (export them before starting the dev server):
- `ANTHROPIC_API_KEY` — for the `/api/claude` business-card OCR proxy
- `SUPABASE_URL` — Supabase project REST API base URL
- `SUPABASE_SERVICE_KEY` — Supabase service-role key for admin CRUD via `/api/data`

The frontend reads from Supabase directly using a hardcoded anon key, so the dashboard loads data without any local env vars.

### No lint, test, or build

This project has no linter, no automated tests, and no build step. Validation is manual: load the app in a browser and interact with it.

### Edit mode password

The client-side edit mode password is `Ao20170612` (hardcoded in `index.html`).
