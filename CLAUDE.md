# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nahwärme Verbrauchsportal — a district heating consumption management app with customer portal and operator billing. German-language UI.

## Commands

```bash
npm run dev              # Dev server on http://localhost:3000
npm run build            # Production build (use to verify changes compile)
npx prisma db push       # Push schema changes to DB (dev)
npm run db:seed          # Seed with test data (tsx prisma/seed.ts)
npx prisma studio        # Visual DB browser
```

No test suite exists. Verify changes with `npm run build`.

## Docker / Deployment

```bash
# From repo root (docker-compose.yml is at root, Dockerfile at docker/Dockerfile)
docker compose up --build

# On first run or after schema changes:
docker compose exec web npx prisma db push
docker compose exec web npm run db:seed
```

Production uses PostgreSQL (via `docker-compose.yml`). Local dev uses SQLite — set `DATABASE_URL=file:./dev.db` and keep `provider = "sqlite"` in `prisma/schema.prisma` locally, but **do not commit sqlite provider** (schema is set to `postgresql` for deployment).

## Architecture

**Stack**: Next.js 14 (App Router) + TypeScript + Prisma + NextAuth (JWT) + Recharts. **Dev**: SQLite. **Production**: PostgreSQL (Docker).

**Two user roles with separate UIs:**
- **USER** — `/dashboard` (charts + meter readings), `/installments`, `/profile`
- **ADMIN** — `/admin` (customer management, billing periods, tariffs, per-customer meter entry management with charts)

**Auth flow**: `middleware.ts` protects `/dashboard/*`, `/installments/*`, `/profile/*`, `/admin/*` via NextAuth. Session includes `user.id` and `user.role` (extended in `types/next-auth.d.ts`). Auth config in `lib/auth.ts`. No self-registration — admin creates customers.

**API authorization pattern**: Every API route checks `getServerSession(authOptions)`. Admin routes additionally check `session.user.role !== 'ADMIN'`. User-facing routes scope queries to `session.user.id`.

**Dual-access APIs**: Some endpoints serve both roles — `/api/installments` returns own data for users, accepts `?userId=xxx` for admins. `/api/admin/*` routes are admin-only.

**Billing calculation** (`/api/billing/calculate`): Splits billing period into tariff time-slices when tariffs change mid-period. Consumption is distributed proportionally by days across tariff slices. Base price is prorated per-day. Installment overlap uses calendar months.

**Meter entry validation**: Chronological ordering enforced — new values must be between previous and next entries. Duplicate dates rejected. Same logic in both user (`/api/meter-entries`) and admin (`/api/admin/meter-entries`) routes.

**Charts**: Recharts `LineChart` with `ReferenceLine` markers for events (installment changes: `#87CEEB`, tariff changes: `#FF69B4`, invoices: `#FFA500`). Same chart logic exists in both `dashboard/page.tsx` and `admin/page.tsx` (inline IIFE in admin).

## Key Conventions

- **Styling**: Inline CSS throughout, glassmorphism dark theme. Colors: primary `#FFD700`, accent `#228B22`, error `#ff6b6b`, background dark green gradient.
- **Validation**: Zod schemas for API request bodies.
- **Date handling**: `date-fns` with German locale (`de`) for display formatting.
- **Icons**: `lucide-react` — each action button in admin uses a specific icon (Edit, Euro, Gauge, Lock, Trash2).
- **State pattern in admin page**: Mutually exclusive dialogs — opening one (editingUser, installmentUser, meterUser) closes others by setting the rest to null.
- **Import alias**: `@/*` maps to project root.

## Environment

**Local dev** — `.env` with `DATABASE_URL=file:./dev.db`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`.

**Docker prod** — copy `docker/.env` to repo root, set `DB_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. The `docker-compose.yml` at repo root reads these vars and constructs the PostgreSQL `DATABASE_URL` automatically.

## Test Credentials (from seed)

- Admin: `admin@nahwaerme.local` / `admin123`
- Customer: `kunde@example.com` / `kunde123`
