# AGENTS.md

## Cursor Cloud specific instructions

### Overview

FOODEX-2026 is a single-page web application for managing business card and gallery data from the FOODEX JAPAN 2026 trade show. It is a Japanese-language internal tool for ANANAS Japan Co., Ltd.

### Tech Stack

- **Frontend**: Single `index.html` file with inline CSS/JS (no framework, no build step, no bundler)
- **Backend**: Two Vercel Serverless Functions (`api/claude.js`, `api/data.js`) using only Node.js built-ins
- **Database**: Supabase (PostgreSQL via REST API)
- **AI/OCR**: Anthropic Claude API for business card image extraction
- **Hosting**: Vercel (configured via `vercel.json`)

### Dependencies

There is no `package.json` and no Node.js dependencies to install. The serverless functions use only the built-in `fetch` API.

### Running Locally

Since `vercel dev` requires Vercel authentication (which is not available in Cloud Agent VMs), use the included `dev-server.mjs` instead:

```bash
node dev-server.mjs
```

This starts a local server on port 3000 that:
- Serves `index.html` as the static frontend
- Routes `/api/claude` and `/api/data` to the respective serverless function handlers

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Authentication for Claude AI API (used by `api/claude.js`) |
| `SUPABASE_URL` | Supabase project REST endpoint (used by `api/data.js`) |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key for admin access (used by `api/data.js`) |

Without these variables, the API endpoints return descriptive error messages but the frontend still renders (with empty data).

### Lint / Test / Build

- **No linter** is configured in this project.
- **No test suite** exists.
- **No build step** is required — the frontend is a single static HTML file.

### Key Gotchas

- The frontend hardcodes a Supabase anon key and URL for direct client-side reads. The `api/data.js` function uses a separate service-role key for server-side CRUD.
- Edit mode is password-protected with a hardcoded password (`Ao20170612`).
- The `vercel.json` sets `maxDuration` for the serverless functions (60s for claude, 30s for data).
