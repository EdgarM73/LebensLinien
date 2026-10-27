# Lebenslinien (Life Lines)

[Deutsch](README.md) · **English**

Turns one person from **Gramps Web** into a portrait video (1080×1920): every close family member is a glowing thread.
New people swing into your life (births, marriages), people who have died rise as stars, and in the end everything
joins into a constellation.

Idea: [@SecretFire79](https://x.com/SecretFire79)

**Running it as a web server or container:** see [GUIDE.en.md](GUIDE.en.md) (requirements, Docker, local start, troubleshooting).

## Requirements
Node.js ≥ 18 and `ffmpeg` on the PATH. Run `npm install` once.

## Usage
Each main person has their own configuration file `config_<name>.json` (e.g. `config_grandpa.json`), copied from
`config.example.json`. It contains the access data (`url`, `username`; better to give the password via the environment
variable `GRAMPS_PASSWORD`), the main person (`person`: Gramps ID or name) and their `extras` (friends, colleagues).
There is no shared config.json.

```bash
node src/index.js config_grandpa.json
```

The video is named after the person, e.g. `Max Mustermann.mp4` (change it with `--out` or `"out"` in the configuration).
If a name matches several people, the Gramps IDs are listed; then set `person` to the ID.

Useful options: `--demo` (sample data, no configuration needed), `--still 30` (only a PNG at second 30), `--dump model.json` /
`--model model.json` (inspect or hand-edit the data), `--seconds`, `--audio music.mp3`, `--lang en`, `--size 720x1280`,
`--no-grandchildren`, `--anonymous` (no names: only "Me", "Wife", "Son" …; in the configuration `"anonymous": true`).

## Language

`"lang"` in the configuration or `--lang` on the command line: `de` (German, default), `en` (English), `tr` (Turkish),
`bs` (Bosnian). It affects the relationship labels, "Me", the age display and the closing text. All texts live in
`src/i18n.js`, where you can also add another language. The closing text can be overridden per person with `"texts"`.

For `extras`, `"rel"` can be a fixed text, `"friend"` / `"colleague"` (translated automatically) or given per language:
`"rel": {"de": "Nachbar", "tr": "Komşu", "bs": "Komšija"}`.

## Friends, colleagues and other non-relatives
Add them to `"extras"` in `config_<name>.json` (or pass `--extras file.json`):

- `name`, `rel` (label, e.g. "Friend"), `start` (year or "1988-03" from which the person is part of the life) – required.
- `end` (optional): without it the person stays until the end. With `end` the line drifts away (contact faded);
  with `"exit": "star"` it rises as a star (deceased).
- Instead of `name` you can use `"id": "I0123"`: the name (and a death date, then shown as a star) come from Gramps.

The timeline starts two years before the main person is born; the main person appears in the centre of the picture at birth.
Everyone else is spread over both sides: father on the left, mother on the right (grandparents on the side of their child);
siblings, partners, children and grandchildren alternate; children-in-law stand on their partner's side; friends alternate
on the outer edges. The closer to the centre, the closer the relationship (children, partner, parents/grandchildren, siblings, rest).

## Web interface

Besides the command line there is a local web interface for several user accounts. For each account it manages the Gramps
connection, the main person and additional people, and starts the video rendering. The interface itself is in German.

```bash
npm run web
```

Then open `http://127.0.0.1:3000`. Node.js 18 or newer, `npm install` and `ffmpeg` on the PATH are required. New accounts need
a password of at least 12 characters. To protect against open registration, set an invitation code before starting:

```powershell
$env:APP_REGISTRATION_KEY = "a-long-random-code"
npm run web
```

In the dashboard each account can upload optional background music and remove it again. MP3, WAV, M4A, AAC, OGG and FLAC up to
50 MB are supported. The file is stored in `data/audio/` and used for the next video. The title and both lines of the closing
text can also be edited; when the video language changes, the matching texts from the translation table are suggested.

The web app binds to `127.0.0.1` by default. Users, configurations, videos and the local encryption key are stored in `data/`;
this folder is excluded from Git. Backups must contain `data/master.key` together with `data/users.json`, otherwise stored Gramps
passwords can no longer be decrypted. For operation reachable from outside, provide `APP_KEY` (Base64-encoded 32 bytes) through
the environment and back it up separately.

Gramps passwords are encrypted with AES-256-GCM, account passwords are stored as scrypt hashes. Gramps connections must use
HTTPS; HTTP is only allowed for `localhost`. Do not expose the web interface to the internet unprotected. For external access you need
at least an HTTPS reverse proxy, `COOKIE_SECURE=true`, an `APP_REGISTRATION_KEY`, a well-protected host and a limit on the allowed
Gramps servers (comma-separated host names in `APP_ALLOWED_GRAMPS_HOSTS`). Sessions are valid for 12 hours and are discarded
when the server restarts.

## Docker
Docker with Docker Compose is required. In the project folder create a `.env` from the template and replace the invitation
code with a long random value:

```bash
cp .env.example .env
docker compose up --build -d
```

On Windows PowerShell copy the template with `Copy-Item .env.example .env`. The application is then available at
`http://localhost:3000`. By default the container binds the port to the local machine only; for external access use an HTTPS
reverse proxy and set `COOKIE_SECURE=true` in `.env`. The local port can be changed with `PORT`.

Users, videos, music and the encryption key live in the persistent Docker volume `lebenslinien_lebenslinien_data`.
`docker compose down` keeps this data; `docker compose down -v` deletes the volume irrevocably. Back up the volume.

## What is shown
Grandparents, parents, siblings (including half-siblings), partners (on divorce the line drifts away), children and
grandchildren together with their spouses (sons-/daughters-in-law). The time axis is the main person's age. Events without
a date are skipped and reported as a note at startup.

## Tests
The local test suite reads `test-stammbaum-huber.ged` and checks the family groups of the generated model:

```bash
npm test
```

The optional live test needs the same family tree imported into Gramps Web. Credentials belong in the locally ignored
`config_test.json` (fields `url`, `username` and `password`) or in `GRAMPS_TEST_USERNAME` and `GRAMPS_TEST_PASSWORD`.
With credentials set, the live test queries the Gramps Web API read-only.
