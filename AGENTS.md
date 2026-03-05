# AGENTS.md - Nahwärme Verbrauchsportal

## Project Overview

Fullstack-Webanwendung für Nahwärme-Verbrauchsmanagement mit Kundenportal und Betreiber-Abrechnung.

## Repository

- **GitHub**: https://github.com/stglo-KI/Nahw-rme-Verbrauch
- **Version**: 1.0.0

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js (JWT)
- Recharts
- Docker + Docker Compose

## Project Structure

```
/app                 # Next.js App Router
  /api/auth         # NextAuth
  /api/users        # User CRUD
  /api/meter-entries
  /api/installments
  /api/tariffs
  /api/billing      # Abrechnung
  /api/admin        # Admin CRUD
  /api/n8n          # n8n Webhook API
  /dashboard        # Verbrauchs-Dashboard
  /admin            # Admin-Backend
/prisma             # Schema + Seeds
/docker             # Docker Compose
/docs               # Decisions
```

## Development Commands

```bash
# Install dependencies
npm install

# Database
npx prisma migrate dev    # Create migrations
npx prisma generate        # Generate client
npm run db:seed            # Seed data

# Development
npm run dev                # Start dev server

# Build
npm run build              # Production build
npm start                  # Start production

# Docker
cd docker
docker-compose up -d       # Start containers
docker-compose logs -f     # View logs
```

## Key Features

### User (Kunde)
- Registration / Login / Logout
- Meter readings (Zählerstände erfassen)
- Dashboard with charts (Monate/Jahre)
- Installments (Abschläge verwalten)
- Profile management

### Admin (Betreiber)
- User management (lock/unlock)
- Tariffs (Arbeitspreis + Grundpreis)
- Billing periods
- Billing runs (Abrechnungslauf)
- CSV Export

### n8n Integration
- Webhook API at `/api/n8n`
- Actions: createMeterEntry, getUser, getUsers

## Database Schema

- User (id, email, passwordHash, role, status)
- CustomerProfile (userId, firstName, lastName, address, customerNumber)
- MeterEntry (userId, date, value, entryType)
- Installment (userId, amount, validFrom, validTo)
- Tariff (name, validFrom, validTo, energyPrice, basePrice)
- BillingPeriod (name, startDate, endDate, status)
- Invoice (billingPeriodId, userId, consumption, costs, balance)

## Tests

No automated tests implemented yet.

## Deployment

See README.md for Docker/Synology deployment instructions.

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Server Components by default
- 'use client' for interactive components

## Branding (from Template)

Colors:
- Primary: #FFD700 (Gold)
- Secondary: #DAA520 (Dark Goldenrod)
- Accent: #228B22 (Forest Green)
- Background: Dark greens gradient

Font: Inter
