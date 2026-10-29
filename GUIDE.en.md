# Lebenslinien (Life Lines) – Guide

[Deutsch](ANLEITUNG.md) · **English**

Lebenslinien turns one person from **Gramps Web** into a portrait video (1080×1920): family, friends and colleagues are
glowing life lines, people who have died rise as stars, and in the end a constellation appears.

Idea: [@SecretFire79](https://x.com/SecretFire79)

This guide describes the web interface. There are two ways to run it:

| | A) Container (Docker) | B) Local web server |
|---|---|---|
| Suited for | permanent operation on a server or NAS | quickly trying it out on your own PC |
| What gets installed | only Docker | Node.js and ffmpeg |
| Font in the video | DejaVu (included in the container) | Georgia / Segoe UI on Windows |

For scripts and single videos without the web interface there is also the command line, see [README.en.md](README.en.md).

Note: the web interface and its messages are in German. This guide gives the German label first and the English meaning in brackets.

---

## 1. Requirements

**Gramps Web (both ways)**
- A running Gramps Web instance with REST API and a user account that may **read** the family tree.
- The address must use **HTTPS** and be reachable from the machine running Lebenslinien.
  Plain `http://` is only allowed for `localhost`. An internal Docker address such as `https://172.23.0.5:5000`
  will not work; use the address under which you open Gramps Web in the browser (e.g. behind a reverse proxy).
- The main person needs a **birth date**. Without a birth year no life line can be drawn.
  People without a date are skipped and reported as a note in the log.

**Way A: Container**
- Docker Engine with Docker Compose v2 (`docker compose …`).
- A machine with at least 1 GB of free memory. Rendering uses one CPU core and takes about as long as the video itself
  (1 to 2 minutes).
- Optionally an HTTPS reverse proxy if the site should be reachable from outside (see section 4).

**Way B: Local**
- Node.js 18 or newer (version 22 recommended, the container uses it too).
- `ffmpeg` on the `PATH` (test: `ffmpeg -version`). Windows: `winget install Gyan.FFmpeg`, Linux: `apt install ffmpeg`,
  macOS: `brew install ffmpeg`.
- On Linux additionally a font, e.g. `apt install fonts-dejavu-core`.

---

## 2. Way A: Deploy as a container

1. Get the project and change into its folder.
2. Create the configuration:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell: `Copy-Item .env.example .env`

3. In `.env` replace at least the **invitation code**. Without it the container does not start.
   A good value can be generated like this:

   ```bash
   openssl rand -base64 24
   ```

4. Build and start:

   ```bash
   docker compose up --build -d
   ```

5. Open `http://127.0.0.1:3000` in the browser (port: see `PORT` in `.env`).

**Settings in `.env`**

| Variable | Meaning | Default |
|---|---|---|
| `APP_REGISTRATION_KEY` | Invitation code; nobody can register without it. **Required** | – |
| `BIND_ADDR` | Address the container port is bound to | `127.0.0.1` (this machine only) |
| `PORT` | Port on the host | `3000` |
| `COOKIE_SECURE` | `true` as soon as the site is served over HTTPS | `false` |
| `APP_ALLOWED_GRAMPS_HOSTS` | Allowed Gramps host names, comma-separated (e.g. `gramps.example.org`) | empty = all |
| `APP_KEY` | Your own encryption key (Base64, 32 bytes): `openssl rand -base64 32` | generated automatically |

**Operation**

```bash
docker compose logs -f          # follow the log
docker compose restart          # restart
docker compose up --build -d    # rebuild after an update (new code)
docker compose down             # stop, data is kept
```

The container reports its state via `/api/status` (Docker healthcheck; `docker compose ps` shows "healthy").

**Data and backup:** user accounts, Gramps credentials (encrypted), videos, music and the key live in the Docker volume
`lebenslinien_lebenslinien_data`. `docker compose down -v` **deletes** this volume irrevocably.
Back it up into a file in the current folder:

```bash
docker run --rm -v lebenslinien_lebenslinien_data:/data -v "$PWD":/backup busybox tar czf /backup/lebenslinien-data.tgz -C /data .
```

---

## 3. Way B: Start locally as a web server

1. Install dependencies (once):

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm run web
   ```

   With an invitation code (recommended as soon as someone else uses the machine):

   ```powershell
   $env:APP_REGISTRATION_KEY = "a-long-random-code"
   npm run web
   ```

   Linux/macOS: `APP_REGISTRATION_KEY=… npm run web`

3. Open `http://127.0.0.1:3000` in the browser.

Locally the server binds to `127.0.0.1` only, and the data lives in the `data/` folder (accounts, videos, music, `master.key`).
Port and location can be changed with `PORT` and `APP_DATA_DIR`. Stop with `Ctrl + C`.

---

## 4. Making it reachable from outside (only with protection)

The interface should **never** be exposed to the internet unprotected. At least required:

- HTTPS through a reverse proxy (Caddy, nginx, Traefik …) pointing at the container port.
- `COOKIE_SECURE=true` in `.env`.
- A long `APP_REGISTRATION_KEY`.
- `APP_ALLOWED_GRAMPS_HOSTS` limited to your Gramps server.
- Only set `BIND_ADDR` to another address if the proxy needs it (e.g. the address on the shared Docker network),
  never to `0.0.0.0` without a firewall.

---

## 5. Using it

1. **Register** (first time): enter a user name (3 to 40 characters), a password (at least 12 characters) and the invitation code.
   This account belongs to Lebenslinien only and has nothing to do with Gramps.
2. **01 Gramps-Verbindung (Gramps connection):** server URL (HTTPS), Gramps user name and password, **Hauptperson (main person)**
   (preferably the Gramps ID, e.g. `I0044`; a name with several matches aborts), the **Sprache (language)** (Deutsch, English, Türkçe,
   Bosanski) and whether names are shown. With "Ohne Namen" (without names) only the relationship appears in the picture
   ("Me", "Wife", "Son" …), and neither the opening title nor the file name contains a name. In the field **Bezeichnung der Hauptperson (label of the main person)** you set what the main person is called then (e.g. "Grandpa" or "Mom"); empty means "Me".
   Optionally upload **Hintergrundmusik (background music)** (MP3, WAV, M4A, AAC, OGG or FLAC, at most 50 MB).
3. **02 Weitere Menschen (more people):** add friends, colleagues and other non-relatives:
   - name or Gramps ID (with an ID, name and death date come from Gramps),
   - label (e.g. "Friend"),
   - **Start** as `YYYY` or `YYYY-MM` (required), from then on the person is part of the life,
   - **Ende (end)** (optional): without an end the person stays until the finish; with an end the line drifts away or rises as a star (deceased).
4. **03 Schlusstext (closing text):** adjust the title and two lines. The suggestions follow the chosen language.
5. **Save**, then **Video erstellen (create video)**. After one to two minutes the download appears. Per account the **latest** video is kept.

The Gramps password is stored encrypted (AES-256-GCM); account passwords only as scrypt hashes.

**What appears in the video:** grandparents, parents, siblings (including half-siblings), partners, children, grandchildren and their
spouses, plus your additional people. The timeline starts two years before the birth; the main person stays in the centre and
appears at birth. Only people who have died become stars at the end; the living stay at the bottom.

**Limits:** only **one** video is rendered at a time (further requests get a notice), a video may take at most 15 minutes,
after 20 failed sign-in attempts within 15 minutes an IP is blocked, sessions expire after 12 hours.

---

## 6. When something does not work

| Problem | Cause and solution |
|---|---|
| `docker compose` says "Set APP_REGISTRATION_KEY in .env" | `.env` is missing or the code is empty. Do steps 2 and 3 of section 2. |
| "Für Gramps-Verbindungen ist HTTPS erforderlich" (HTTPS is required) | Enter an HTTPS address (e.g. via your reverse proxy). `http://` only works for `localhost`. |
| "Dieser Gramps-Server ist nicht freigegeben" (server not allowed) | The host name is not listed in `APP_ALLOWED_GRAMPS_HOSTS`. |
| `ECONNREFUSED` or "fetch failed" | Gramps is not reachable from this machine/container. Internal Docker IPs do not work, use the public address. Inside the container `localhost` points at the container itself. |
| "Videoerzeugung fehlgeschlagen" (video creation failed) | Check credentials, URL and main person. Details are in the log (`docker compose logs`). For security the web interface only shows a general message. |
| "Mehrere Treffer" (several matches) / "Niemand gefunden" (nobody found) | Enter the Gramps ID instead of the name for the main person. |
| "kein Geburtsjahr hinterlegt" (no birth year) | Create a birth event with a date for the main person in Gramps. |
| "Derzeit wird bereits ein Video erstellt" (a video is already being created) | Another video is running. Wait briefly and try again. |
| Stored Gramps passwords cannot be decrypted after a move | `data/master.key` (or `APP_KEY`) is missing. Always back it up together with `users.json`. |
| Font looks different in the container than locally | The container only has DejaVu. This is intended; the result stays readable. |

---

## 7. Helpful extras

- Tests: `npm test` (uses the sample file `test-stammbaum-huber.ged`).
- Quick preview without Gramps: `node src/index.js --demo --out demo.mp4`.
- Language texts and additional languages: `src/i18n.js`.
- Command line with one configuration file per person: [README.en.md](README.en.md).
