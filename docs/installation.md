# Installationsanleitung - Nahwärme Verbrauchsportal

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Lokale Entwicklung](#lokale-entwicklung)
3. [Docker Compose (Produktion)](#docker-compose-produktion)
4. [Synology Deployment](#synology-deployment)
5. [Erstkonfiguration](#erstkonfiguration)
6. [Updates einspielen](#updates-einspielen)

---

## Voraussetzungen

### Lokale Entwicklung

- **Node.js**: Version 20.x
- **npm**: Version 10.x (kommt mit Node.js)
- **PostgreSQL**: Version 15+ (wird via Docker bereitgestellt)

### Produktion (Synology)

- Synology NAS mit Docker-Paket
- Domain mit HTTPS-Zertifikat (Let's Encrypt)
- PostgreSQL-Datenbank (lokal oder extern)

---

## Lokale Entwicklung

### 1. Repository klonen

```bash
git clone https://github.com/stglo-KI/Nahwaerme-Verbrauch.git
cd Nahwaerme-Verbrauch
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

Bearbeite `.env` und setze:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nahwaerme?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ein-sicheres-geheimnis-generieren"
```

**Tipp**: NEXTAUTH_SECRET generieren:
```bash
openssl rand -base64 32
```

### 4. Datenbank einrichten

```bash
# Migrationen erstellen und ausführen
npx prisma migrate dev --name init

# Oder Schema nur pushen (für Entwicklung)
npm run db:push
```

### 5. Seed-Daten laden

```bash
npm run db:seed
```

Dies erstellt einen Admin-Benutzer:
- **E-Mail**: admin@nahwaerme.local
- **Passwort**: admin123

### 6. Entwicklungsserver starten

```bash
npm run dev
```

Öffne http://localhost:3000

---

## Docker Compose (Produktion)

### 1. Docker-Ordner vorbereiten

```bash
cd docker
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

Bearbeite `.env`:

```env
DB_PASSWORD=ein-sicheres-datenbank-passwort
NEXTAUTH_URL=https://deine-domain.tld
NEXTAUTH_SECRET=ein-sicheres-geheimnis
N8N_API_KEY=    # Optional: für n8n Integration
```

### 3. Container starten

```bash
docker-compose up -d
```

### 4. Datenbank-Migration

```bash
# In den Container wechseln
docker exec -it nahwaerme-web sh

# Migrationen ausführen
npx prisma migrate deploy

# Seed laden
npm run db:seed

# Container verlassen
exit
```

### 5. Überprüfen

```bash
docker-compose logs -f web
```

---

## Synology Deployment

### 1. Docker-Paket installieren

Im Synology Paketzentrum:
- **Docker** installieren

### 2. Projekt hochladen

Per File Station oder SCP:
- Projektordner nach `/volume1/docker/nahwaerme/` kopieren

### 3. Docker Compose starten

Via SSH (Telnet/SSH aktivieren in Systemsteuerung → Terminal):

```bash
cd /volume1/docker/nahwaerme/docker

# .env Datei erstellen (siehe oben)

# Container starten
docker-compose up -d
```

### 4. Reverse Proxy einrichten

**Systemsteuerung → Anwendungsportal → Reverse Proxy**

Neue Regel erstellen:
- **Quelle**:
  - Protokoll: HTTPS
  - Hostname: ihre-domain.de
  - Port: 443
- **Ziel**:
  - Protokoll: HTTP
  - Hostname: localhost
  - Port: 3000

### 5. HTTPS einrichten

**Option A: Synology Let's Encrypt**
- Systemsteuerung → Sicherheit → Zertifikat
- Zertifikat hinzufügen → Let's Encrypt

**Option B: Traefik (empfohlen)**
- Siehe docs/decisions.md für Traefik-Setup

### 6. Firewall anpassen

**Systemsteuerung → Sicherheit → Firewall**
- Regel erstellen: TCP-Port 3000 nur für localhost erlauben
- Der Reverse Proxy regelt den Zugriff von außen

---

## Erstkonfiguration

### 1. Admin-Login

Nach dem ersten Start:
- URL: https://ihre-domain.de/auth/login
- E-Mail: admin@nahwaerme.local
- Passwort: admin123

**WICHTIG**: Passwort sofort ändern!

### 2.Tarif anlegen

1. Als Admin anmelden
2. Zum Admin-Bereich navigieren
3. Tab **Tarife** → Neuer Tarif
   - Name: z.B. "Standard 2024"
   - Gültig ab: 01.01.2024
   - Arbeitspreis: z.B. 0.12 (€/kWh)
   - Grundpreis: z.B. 120 (€/Jahr)

### 3. Benutzer-Registrierung testen

1. Abmelden
2. Zur Registrierungsseite
3. Neuen Benutzer anlegen

---

## Updates einspielen

### Option A: Git Pull (empfohlen)

```bash
# Auf dem Server
cd /volume1/docker/nahwaerme

# Neuen Code holen
git pull origin main

# Container neu bauen
cd docker
docker-compose build --no-cache

# Container neu starten
docker-compose up -d

# Migrationen falls nötig
docker exec -it nahwaerme-web npx prisma migrate deploy
```

### Option B: Image-basiert (fortgeschritten)

Siehe docs/decisions.md für GHCR-Workflow mit GitHub Actions.

---

## Backup & Restore

### Datenbank-Backup

```bash
# Backup erstellen
docker exec -it nahwaerme-db pg_dump -U postgres nahwaerme > backup.sql

# Backup wiederherstellen
docker exec -i nahwaerme-db psql -U postgres nahwaerme < backup.sql
```

### Volumes sichern

```bash
# Volumes auflisten
docker volume ls

# Volume sichern
docker run --rm -v nahwaerme-postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```

---

## Problembehandlung

### Container startet nicht

```bash
# Logs anzeigen
docker-compose logs web

# Container neu erstellen
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Datenbank-Verbindungsfehler

- Prüfen ob PostgreSQL-Container läuft: `docker ps`
- Logs prüfen: `docker-compose logs db`
- DATABASE_URL in .env prüfen

### Port 3000 belegt

In `docker/docker-compose.yml` Port ändern:
```yaml
ports:
  - "3001:3000"  # Ändern auf freien Port
```

---

## Support

- GitHub Issues: https://github.com/stglo-KI/Nahwaerme-Verbrauch/issues
- Dokumentation: docs/
