# Technische Entscheidungen

## Architektur

**Entscheidung**: Next.js Monolith (App Router + API Routes)

**Begründung**:
- Einheitliche Codebasis einfacher zu warten
- NextAuth direkt integriert
- Weniger Infrastructure-Overhead als separates Backend
- Perfekt für Synology-Deployment

## Datenbank

**Entscheidung**: PostgreSQL

**Begründung**:
- Robust, bewährt, ACID-konform
- Prisma als ORM - typsicher, gute Migrationen
- Synology unterstützt offiziell

## Authentifizierung

**Entscheidung**: NextAuth mit Credentials Provider + JWT

**Begründung**:
- Session-basierte Auth (JWT)
- Credentials für klassisches Email/Passwort
- RBAC direkt in NextAuth integriert

## Verbrauchserfassung

**Entscheidung**: Zählerstand-Modus (nicht Verbrauchswert)

**Begründung**:
- Natürlich für Nahwärme (Zähleruhr)
- Automatische Verbrauchsberechnung aus Differenz
- Plausibilitätsprüfung (monoton steigend)

## Deployment

**Entscheidung**: Docker Compose auf Synology

**Begründung**:
- Portable Container
- Einfache Updates (Image neu laden)
- Separates DB-Volume für Persistenz

## Update-Strategie

**Empfehlung**: GitHub Actions → GHCR Images

Workflow:
1. Code push → GitHub
2. GitHub Action baut Image → GHCR
3. Synology: `docker-compose pull && docker-compose up -d`

Alternativ (direkt):
1. Auf Synology: `git pull`
2. `docker-compose build --no-cache`
3. `docker-compose up -d`
