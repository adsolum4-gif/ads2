# Adsterra

User and admin apps for Adsterra: task reviews, VIP levels, wallets, deposits, and withdrawals, backed by Supabase.

## Apps

- User app — Vite + React, port `5173`
- Admin app — Vite + React (MUI), port `5174`

Production (`npm run build`) puts the user app at `/` and the admin app at `/admin`.

**Render:** Use build command `npm install && npm --prefix admin install && npm run build`, publish directory `dist`, and SPA rewrites (see `render.yaml` or `public/_redirects`). If `/admin` sends you to `/login`, the host is serving the user app for admin URLs — fix rewrites, not auth.

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
