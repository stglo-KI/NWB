# AGENTS.md - Nahwärme Verbrauchsportal

## Project Overview

Fullstack-Webanwendung für Nahwärme-Verbrauchsmanagement mit Kundenportal und Betreiber-Abrechnung.

## Repository

- **GitHub**: https://github.com/stglo-KI/Nahw-rme-Verbrauch
- **Version**: 1.0.0
- **Node**: 20.x
- **Package Manager**: npm

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- SQLite + Prisma ORM
- NextAuth.js (JWT)
- Recharts (mit ReferenceLine für Ereignis-Marker)
- Lucide React Icons
- Zod (Validierung)
- date-fns (Datumsformatierung, deutsche Locale)
- bcryptjs (Passwort-Hashing)

## Development Commands

```bash
# Install dependencies
npm install

# Database
npx prisma migrate dev           # Create/run migrations
npx prisma generate               # Generate Prisma client
npm run db:seed                   # Seed database with test data
npm run db:push                   # Push schema (dev only)
npm run db:studio                 # Open Prisma Studio

# Development
npm run dev                       # Start dev server (http://localhost:3000)
npm run build                     # Production build
npm run start                     # Start production server

# Linting
npm run lint                      # Run ESLint
npm run lint --fix                # Fix linting issues

# Type checking
npx tsc --noEmit                  # TypeScript type check
```

## Project Structure

```
/app                     # Next.js App Router
  /api                   # API Routes
    /auth                # NextAuth endpoints
    /users               # User CRUD + password change
      /password          # Passwort-Änderung
    /meter-entries       # Kunden-Zählerstände (eigene)
    /installments        # Abschläge (GET eigene, GET ?userId=xxx für Admin, POST Admin-only)
    /invoices            # Kunden-Abrechnungen (eigene)
    /tariffs             # Tarife (GET public, POST Admin-only)
    /billing             # Abrechnungsperioden CRUD + Statusänderung
      /calculate         # Abrechnungsberechnung
    /admin               # Admin-only Endpunkte
      /users             # Kundenverwaltung (CRUD, Sperren/Entsperren)
      /meter-entries     # Zählerstände pro Kunde (GET/POST/PUT/DELETE)
      /invoices          # Rechnungen (GET mit ?billingPeriodId / ?userId Filter)
    /n8n                 # n8n Webhook API
  /dashboard             # Kunden-Dashboard (Charts + Zählerstände)
  /admin                 # Admin-Backend (Kunden, Abrechnung, Tarife)
  /auth/login            # Login-Seite
  /installments          # Kunden-Abschlagsübersicht
  /profile               # Kunden-Profil
  /providers.tsx         # NextAuth SessionProvider
/prisma                  # Schema + Seed
/lib                     # Shared utilities (db, auth)
```

## Database Schema (SQLite)

- **User**: id, email, passwordHash, role (USER/ADMIN), status (ACTIVE/LOCKED)
- **CustomerProfile**: userId, gender, firstName, lastName, street, postalCode, city, phone, objectName, customerNumber, connectionId
- **MeterEntry**: userId, date, value, entryType (METER_READING/CONSUMPTION), comment — @@index([userId, date])
- **Installment**: userId, amount, validFrom, validTo — @@index([userId, validFrom])
- **Tariff**: name, validFrom, validTo, energyPrice (€/kWh), basePrice (€/Jahr) — @@index([validFrom])
- **BillingPeriod**: name, startDate, endDate, status (DRAFT/RUNNING/COMPLETED)
- **ControlReading**: billingPeriodId, date, value, comment
- **Invoice**: billingPeriodId, userId, consumption, energyCosts, baseCosts, totalCosts, installmentsSum, balance, frozenData — @@unique([billingPeriodId, userId])

## Key Features

### Kundenportal
- Dashboard mit 12-Monats- und 10-Jahres-Verbrauchsgraphen
- Graphen zeigen Ereignis-Marker (ReferenceLine): Abschlag-Änderungen (blau), Tarifänderungen (pink), Abrechnungen (orange)
- Zählerstände erfassen, anzeigen, löschen + CSV-Export
- Abschlagsübersicht, Profil bearbeiten, Passwort ändern

### Admin-Bereich
- Kundenverwaltung: Erstellen, Bearbeiten, Sperren/Entsperren, CSV-Export
- Abschlagsverwaltung pro Kunde (Euro-Icon)
- Zählerstandsverwaltung pro Kunde (Gauge-Icon): Erfassen, Bearbeiten (Inline-Edit), Löschen
- Verbrauchsgraphen pro Kunde (12 Monate + 10 Jahre) mit Ereignis-Markern im Zählerstand-Dialog
- Abrechnungsperioden: Erstellen, Starten, Abrechnung berechnen, Abschließen, CSV-Export
- Tarifverwaltung

### Sicherheit
- Keine Selbstregistrierung — Admin erstellt Kunden
- Kunden können objectName/customerNumber nicht ändern
- Admin-Rollenprüfung auf allen /api/admin/* Endpunkten
- Zählerstand-Validierung: chronologisch korrekt, keine Duplikat-Daten

### Test-Zugangsdaten (Seed)
- Admin: admin@nahwaerme.local / admin123
- Kunde: kunde@example.com / kunde123

---

# Code Style Guidelines

## General Principles

- **TypeScript strict mode** enabled - avoid `any`
- **Server Components** by default in Next.js App Router
- Use `'use client'` directive only for interactive components (forms, charts, event handlers)
- Keep functions small and focused (max 50-80 lines)

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `DashboardPage.tsx` |
| Files (utilities) | camelCase | `db.ts`, `auth.ts` |
| API Routes | kebab-case | `meter-entries/route.ts` |
| Components | PascalCase | `UserCard`, `MeterTable` |
| Functions | camelCase | `handleSubmit`, `fetchEntries` |
| Variables | camelCase | `userData`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE` |
| CSS Classes | kebab-case | `.btn-primary`, `.stat-card` |
| Database Models | PascalCase | `User`, `MeterEntry` |
| Enum Values | UPPER_SNAKE_CASE | `ACTIVE`, `METER_READING` |

## Import Order

```typescript
// 1. Next.js/React
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 2. External libraries
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { BarChart, Bar } from 'recharts'
import { Plus, Trash2 } from 'lucide-react'

// 3. NextAuth
import { useSession, signOut } from 'next-auth/react'

// 4. Internal - @/* (alias)
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// 5. Types
import type { MeterEntry, UserData } from '@/types'
```

## TypeScript Guidelines

- Always define return types for API routes and utility functions
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any`, use `unknown` when type is uncertain then narrow
- Use Zod for runtime validation of request/response data

```typescript
// Good
interface MeterEntry {
  id: string
  date: Date
  value: number
  entryType: 'METER_READING' | 'CONSUMPTION'
}

// Good - Zod for validation
const meterEntrySchema = z.object({
  date: z.string(),
  value: z.number().positive(),
  entryType: z.enum(['METER_READING', 'CONSUMPTION']).default('METER_READING'),
})
```

## Error Handling

- API Routes: Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Use try/catch for async operations, log errors to console
- Validate input with Zod, return 400 for validation errors
- Always check session/authorization before sensitive operations

```typescript
// API Route error pattern
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    // ... operation
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
```

## React/Next.js Patterns

- Use functional components with arrow functions or `function` keyword
- Extract reusable logic into custom hooks
- Use `useEffect` for side effects, include dependency arrays
- Handle loading states explicitly
- Use proper TypeScript types for props

```typescript
// Good - Component with types
interface Props {
  title: string
  entries: MeterEntry[]
  onDelete: (id: string) => void
}

export default function MeterTable({ title, entries, onDelete }: Props) {
  // component logic
}
```

## CSS/Styling

- Use inline styles for dynamic values, CSS classes for static
- Follow template color scheme: Primary (#FFD700), Secondary (#DAA520), Accent (#228B22)
- Use CSS custom properties for repeated values
- Keep responsive design in mind

## API Design

- Use RESTful patterns: GET (list/read), POST (create), PUT (update), DELETE (remove)
- Return JSON responses with consistent structure
- Use searchParams for query parameters in GET requests

## Branding & Farben

- **Primary**: #FFD700 (Gold) — Überschriften, Zählerstände, Monats-Chart-Linie
- **Secondary**: #DAA520 (Dark Goldenrod) — Verbrauchswerte
- **Accent**: #228B22 (Forest Green) — Erfolg, Jahres-Chart-Linie, Abschlag-Icon
- **Background**: Dark greens gradient (#1a2e1a → #0f1f0f → #0a150a)
- **Error**: #ff6b6b — Fehlermeldungen, Löschen-Buttons
- **Chart-Ereignis-Marker**:
  - #87CEEB (Hellblau) — Abschlag-Änderung
  - #FF69B4 (Pink) — Tarifänderung
  - #FFA500 (Orange) — Abrechnung erstellt
- **Font**: Inter
- Glassmorphism cards mit backdrop-filter blur, inline CSS

## Testing

No automated tests implemented yet. When adding tests:
- Use Vitest for unit tests
- Use Playwright for E2E tests
- Place tests alongside components: `ComponentName.test.tsx`

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Keep commits atomic and focused
- Write descriptive commit messages

## Deployment

- SQLite-basiert, kein externer DB-Server nötig
- `npx prisma db push` für Schema-Setup
- `npm run db:seed` für Testdaten
- Siehe docs/installation.md für Details
