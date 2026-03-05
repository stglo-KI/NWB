# Nahwärme Verbrauchsportal

Fullstack-Webanwendung für Nahwärme-Verbrauchsmanagement mit Kundenportal und Betreiber-Abrechnung.

## Features

### Kunde (Nutzer)
- Registrierung / Login
- Zählerstände erfassen (kWh)
- Verbrauchsdashboard mit Charts
- Abschläge verwalten
- Profil bearbeiten

### Betreiber (Admin)
- Benutzerverwaltung (sperren/entsperren)
- Tarife verwalten (Arbeitspreis + Grundpreis)
- Abrechnungsperioden erstellen
- Abrechnungslauf durchführen
- CSV-Export pro Periode
- n8n Webhook-API

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Datenbank**: PostgreSQL
- **ORM**: Prisma
- **Auth**: NextAuth.js (JWT)
- **Charts**: Recharts
- **Docker**: Docker Compose

## Quick Start

### Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Datenbank-Migrationen ausführen
npx prisma migrate dev

# Seed-Daten laden (Admin-User)
npm run db:seed

# Entwicklungsserver starten
npm run dev
```

Öffne http://localhost:3000

### Admin-Login
- E-Mail: admin@nahwaerme.local
- Passwort: admin123

## Docker Deployment

### Produktion

```bash
cd docker

# .env Datei mit eigenen Werten erstellen
cp .env.example .env
# .env bearbeiten mit sicheren Passwörtern

# Container starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f web
```

### Synology Deployment

1. **Docker Compose importieren**:
   - Docker-App öffnen
   - Projekt-Ordner auswählen (docker/)
   - Container erstellen

2. **Reverse Proxy einrichten**:
   - Systemsteuerung > Anwendungsportal > Reverse Proxy
   - Neue Regel erstellen:
     - Quelle: Ihre Domain
     - Ziel: localhost:3000

3. **HTTPS**:
   - Let's Encrypt Zertifikat über Synology DSM oder Traefik

## n8n Integration

API-Endpunkt für Automation:

```
POST /api/n8n
Header: x-n8n-api-key: <IHR_API_KEY>
```

Actions:
- `createMeterEntry` - Zählerstand erfassen
- `getUser` - Benutzerdaten abrufen
- `getUsers` - Alle Benutzer auflisten

Beispiel n8n HTTP Request:
```json
{
  "action": "createMeterEntry",
  "userEmail": "kunde@example.com",
  "date": "2024-01-15",
  "value": 15000.5
}
```

## Projektstruktur

```
/app                 # Next.js App Router
  /api              # API Routes
  /dashboard        # Verbrauchs-Dashboard
  /admin            # Admin-Backend
/prisma             # Datenbank-Schema und Seeds
/docker             # Docker Compose + Dockerfile
/docs               # Dokumentation
```

## Datenmodell

- **User**: Rolle (USER/ADMIN), Status, Auth
- **CustomerProfile**: Adressdaten, Kundennummer
- **MeterEntry**: Zählerstände, Verbrauch
- **Installment**: Abschläge, gültig ab/bis
- **Tariff**: Preise (Arbeitspreis, Grundpreis)
- **BillingPeriod**: Abrechnungszeitraum
- **Invoice**: Generierte Abrechnungen (revisionssicher)

## Lizenz

MIT
