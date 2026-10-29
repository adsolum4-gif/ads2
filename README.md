# Adsterra

User and admin apps for Adsterra: task reviews, VIP levels, wallets, deposits, and withdrawals, backed by Supabase.

## Apps

- User app — Vite + React, port `5173`
- Admin app — Vite + React (MUI), port `5174`

Production (`npm run build`) puts the user app at `/` and the admin app at `/admin`.

**Render (Web Service) — use two fields, not one:**

| Setting | Value | Do **not** use |
|--------|--------|----------------|
| **Build command** | `npm run render:build` | `npm start`, `npm install; npm start` |
| **Start command** | `npm start` | `npm run dev` |

If the build log shows `Serving ... on http://0.0.0.0:10000` and never finishes, **`npm start` is in the Build command** — cancel the deploy and fix the two fields above.

**Render (Static Site):** Build `npm run render:build`, publish **`dist`**, rewrites: `/admin` + `/admin/*` → `/admin/index.html`, then `/*` → `/index.html`.

## Setup

```bash
cp .env.example .env
cp admin/.env.example admin/.env
npm install
npm run dev

cd admin
npm install
npm run dev
```

Required env vars:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
