# Adsterra

User and admin apps for Adsterra: task reviews, VIP levels, wallets, deposits, and withdrawals, backed by Supabase.

## Apps

- User app — Vite + React, port `5173`
- Admin app — Vite + React (MUI), port `5174`

Production (`npm run build`) puts the user app at `/` and the admin app at `/admin`.

**Render:** Never set start command to `npm run dev` — the live site will serve Vite dev HTML (`/@vite/client`) and `/admin` will fall through to the user app → `/login`.

- **Static Site:** Build `npm install && npm --prefix admin install && npm run build`, publish **`dist`**, add [rewrites](https://render.com/docs/redirects-rewrites): `/admin` and `/admin/*` → `/admin/index.html`, then `/*` → `/index.html` (admin rules first).
- **Web Service:** Same build, start **`node scripts/serve-dist.mjs`** (or `npm start` after build).

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
