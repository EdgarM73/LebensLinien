# Lebenslinien – Anleitung

**Deutsch** · [English](GUIDE.en.md)

Lebenslinien erstellt aus einer Person in **Gramps Web** ein Hochformat-Video (1080×1920): Familie, Freunde und Kollegen
sind leuchtende Lebenslinien, Verstorbene steigen als Sterne auf, am Ende entsteht ein Sternbild.

Idee: [@SecretFire79](https://x.com/SecretFire79)

Diese Anleitung beschreibt die Web-Oberfläche. Es gibt zwei Wege, sie zu betreiben:

| | A) Container (Docker) | B) Lokal als Webserver |
|---|---|---|
| Geeignet für | dauerhaften Betrieb auf einem Server oder NAS | schnelles Ausprobieren auf dem eigenen PC |
| Installiert wird | nur Docker | Node.js und ffmpeg |
| Schriftart im Video | DejaVu (im Container enthalten) | Georgia / Segoe UI unter Windows |

Für Skripte und Einzelvideos ohne Weboberfläche gibt es außerdem die Kommandozeile, siehe [README.md](README.md) (English: [README.en.md](README.en.md)).

---

## 1. Voraussetzungen

**Gramps Web (für beide Wege)**
- Eine laufende Gramps-Web-Instanz mit REST-API und ein Benutzerkonto, das den Stammbaum **lesen** darf.
- Die Adresse muss **HTTPS** verwenden und vom Rechner, auf dem Lebenslinien läuft, erreichbar sein.
  Reines `http://` ist nur für `localhost` erlaubt. Eine interne Docker-Adresse wie `https://172.23.0.5:5000`
  funktioniert nicht, nutze die Adresse, unter der du Gramps Web im Browser öffnest (z. B. hinter einem Reverse Proxy).
- Die Hauptperson braucht ein **Geburtsdatum**. Ohne Geburtsjahr lässt sich keine Lebenslinie zeichnen.
  Personen ohne Datum werden übersprungen und im Log als Hinweis ausgegeben.

**Weg A: Container**
- Docker Engine mit Docker Compose v2 (`docker compose …`).
- Ein Rechner mit mindestens 1 GB freiem Arbeitsspeicher. Die Videoerzeugung braucht einen CPU-Kern und dauert
  ungefähr so lang wie das Video selbst (1 bis 2 Minuten).
- Optional ein HTTPS-Reverse-Proxy, wenn die Seite von außen erreichbar sein soll (siehe Abschnitt 4).

**Weg B: Lokal**
- Node.js ab Version 18 (Version 22 empfohlen, die nutzt auch der Container).
- `ffmpeg` im `PATH` (Test: `ffmpeg -version`). Windows: `winget install Gyan.FFmpeg`, Linux: `apt install ffmpeg`,
  macOS: `brew install ffmpeg`.
- Unter Linux zusätzlich eine Schrift, z. B. `apt install fonts-dejavu-core`.

---

## 2. Weg A: Als Container deployen

1. Projekt holen und in den Ordner wechseln.
2. Konfiguration anlegen:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell: `Copy-Item .env.example .env`

3. In `.env` mindestens den **Einladungscode** ersetzen. Ohne ihn startet der Container nicht.
   Einen guten Wert erzeugst du so:

   ```bash
   openssl rand -base64 24
   ```

4. Bauen und starten:

   ```bash
   docker compose up --build -d
   ```

5. Im Browser `http://127.0.0.1:3000` öffnen (Port siehe `PORT` in `.env`).

**Einstellungen in `.env`**

| Variable | Bedeutung | Standard |
|---|---|---|
| `APP_REGISTRATION_KEY` | Einladungscode, ohne ihn kann sich niemand registrieren. **Pflicht** | – |
| `BIND_ADDR` | Adresse, an die der Container-Port gebunden wird | `127.0.0.1` (nur dieser Rechner) |
| `PORT` | Port auf dem Host | `3000` |
| `COOKIE_SECURE` | `true`, sobald die Seite über HTTPS ausgeliefert wird | `false` |
| `APP_ALLOWED_GRAMPS_HOSTS` | Erlaubte Gramps-Hostnamen, kommagetrennt (z. B. `gramps.example.org`) | leer = alle |
| `APP_KEY` | Eigener Verschlüsselungsschlüssel (Base64, 32 Byte): `openssl rand -base64 32` | wird automatisch erzeugt |

**Betrieb**

```bash
docker compose logs -f          # Protokoll ansehen
docker compose restart          # neu starten
docker compose up --build -d    # nach einem Update (neuer Code) neu bauen
docker compose down             # stoppen, Daten bleiben erhalten
```

Der Container meldet seinen Zustand über `/api/status` (Docker-Healthcheck, `docker compose ps` zeigt „healthy“).

**Daten und Backup:** Nutzerkonten, Gramps-Zugangsdaten (verschlüsselt), Videos, Musik und der Schlüssel liegen im
Docker-Volume `lebenslinien_lebenslinien_data`. `docker compose down -v` **löscht** dieses Volume unwiderruflich.
Sicherung in eine Datei im aktuellen Ordner:

```bash
docker run --rm -v lebenslinien_lebenslinien_data:/data -v "$PWD":/backup busybox tar czf /backup/lebenslinien-data.tgz -C /data .
```

---

## 3. Weg B: Lokal als Webserver starten

1. Abhängigkeiten installieren (einmalig):

   ```bash
   npm install
   ```

2. Server starten:

   ```bash
   npm run web
   ```

   Mit Einladungscode (empfohlen, sobald jemand anderes den Rechner nutzt):

   ```powershell
   $env:APP_REGISTRATION_KEY = "ein-langer-zufaelliger-code"
   npm run web
   ```

   Linux/macOS: `APP_REGISTRATION_KEY=… npm run web`

3. Im Browser `http://127.0.0.1:3000` öffnen.

Lokal gilt: Der Server bindet nur an `127.0.0.1`, die Daten liegen im Ordner `data/` (Konten, Videos, Musik, `master.key`).
Port und Ort lassen sich mit `PORT` und `APP_DATA_DIR` ändern. Beenden mit `Strg + C`.

---

## 4. Von außen erreichbar machen (nur mit Schutz)

Die Oberfläche sollte **nie ungeschützt** ins Internet. Mindestens nötig:

- HTTPS über einen Reverse Proxy (Caddy, nginx, Traefik …), der auf den Container-Port zeigt.
- `COOKIE_SECURE=true` in `.env`.
- Einen langen `APP_REGISTRATION_KEY`.
- `APP_ALLOWED_GRAMPS_HOSTS` auf deinen Gramps-Server begrenzen.
- `BIND_ADDR` nur dann auf eine andere Adresse setzen, wenn der Proxy sie braucht (z. B. die Adresse im gemeinsamen Docker-Netz),
  nie auf `0.0.0.0` ohne Firewall.

---

## 5. Bedienung

1. **Registrieren** (beim ersten Mal): Benutzername (3 bis 40 Zeichen), Passwort (mindestens 12 Zeichen) und den Einladungscode eingeben.
   Dieses Konto gehört nur zu Lebenslinien und hat nichts mit Gramps zu tun.
2. **01 Gramps-Verbindung:** Server-URL (HTTPS), Gramps-Benutzername und -Passwort, **Hauptperson** (am besten die Gramps-ID, z. B. `I0044`;
   bei einem Namen mit mehreren Treffern wird abgebrochen), die **Sprache** (Deutsch, English, Türkçe, Bosanski) und ob die Namen angezeigt werden. Bei „Ohne Namen“ steht nur die Beziehung im Bild („Ich“, „Ehefrau“, „Sohn“ …), auch der Titel am Anfang und der Dateiname enthalten dann keinen Namen.
   Optional eine **Hintergrundmusik** hochladen (MP3, WAV, M4A, AAC, OGG oder FLAC, höchstens 50 MB).
3. **02 Weitere Menschen:** Freunde, Kollegen und andere Nicht-Verwandte hinzufügen:
   - Name oder Gramps-ID (mit ID kommen Name und Sterbedatum aus Gramps),
   - Bezeichnung (z. B. „Freund“),
   - **Start** als `JJJJ` oder `JJJJ-MM` (Pflicht), ab dann kommt die Person im Leben vor,
   - **Ende** (optional): ohne Ende bleibt die Person bis zum Schluss, mit Ende driftet die Linie weg oder steigt als Stern auf (verstorben).
4. **03 Schlusstext:** Titel und zwei Zeilen anpassen. Die Vorschläge folgen der gewählten Sprache.
5. **Speichern**, dann **Video erstellen**. Nach ein bis zwei Minuten erscheint der Download. Pro Konto wird das jeweils **letzte** Video aufbewahrt.

Das Passwort für Gramps wird verschlüsselt (AES-256-GCM) gespeichert, die Kontopasswörter nur als scrypt-Hash.

**Was im Video vorkommt:** Großeltern, Eltern, Geschwister (auch Halbgeschwister), Partner, Kinder, Enkel und deren Ehepartner,
dazu deine Zusatzpersonen. Die Hauptperson bleibt in der Bildmitte. Nur Verstorbene werden am Ende zu Sternen, die noch Lebenden bleiben unten.

**Grenzen:** Es wird immer nur **ein** Video gleichzeitig erzeugt (weitere Anfragen bekommen eine Hinweismeldung), ein Video darf höchstens 15 Minuten brauchen,
nach 20 falschen Anmelde-Versuchen innerhalb von 15 Minuten wird eine IP gesperrt, Sitzungen laufen nach 12 Stunden ab.

---

## 6. Wenn etwas nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| `docker compose` meldet „Set APP_REGISTRATION_KEY in .env“ | `.env` fehlt oder der Code ist leer. Schritt 2 und 3 aus Abschnitt 2 ausführen. |
| „Für Gramps-Verbindungen ist HTTPS erforderlich“ | Eine HTTPS-Adresse eintragen (z. B. über deinen Reverse Proxy). `http://` geht nur für `localhost`. |
| „Dieser Gramps-Server ist nicht freigegeben“ | Der Hostname steht nicht in `APP_ALLOWED_GRAMPS_HOSTS`. |
| `ECONNREFUSED` oder „fetch failed“ | Gramps ist von diesem Rechner/Container aus nicht erreichbar. Interne Docker-IPs funktionieren nicht, nimm die öffentliche Adresse. Im Container zeigt `localhost` auf den Container selbst. |
| „Videoerzeugung fehlgeschlagen“ | Zugangsdaten, URL und Hauptperson prüfen. Details stehen im Protokoll (`docker compose logs`). Die Weboberfläche zeigt aus Sicherheitsgründen nur eine allgemeine Meldung. |
| „Mehrere Treffer“ / „Niemand gefunden“ | Bei der Hauptperson die Gramps-ID statt des Namens eintragen. |
| „kein Geburtsjahr hinterlegt“ | In Gramps ein Geburtsereignis mit Datum für die Hauptperson anlegen. |
| „Derzeit wird bereits ein Video erstellt“ | Es läuft gerade ein anderes Video. Kurz warten und erneut versuchen. |
| Gespeicherte Gramps-Passwörter lassen sich nach einem Umzug nicht mehr entschlüsseln | `data/master.key` (bzw. `APP_KEY`) fehlt. Immer zusammen mit `users.json` sichern. |
| Schrift sieht im Container anders aus als lokal | Der Container enthält nur DejaVu. Das ist gewollt, die Darstellung bleibt lesbar. |

---

## 7. Hilfreiches

- Tests: `npm test` (nutzt die Beispieldatei `test-stammbaum-huber.ged`).
- Schnelle Vorschau ohne Gramps: `node src/index.js --demo --out demo.mp4`.
- Sprachtexte und weitere Sprachen: `src/i18n.js`.
- Kommandozeile mit Konfigurationsdatei pro Person: [README.md](README.md).
