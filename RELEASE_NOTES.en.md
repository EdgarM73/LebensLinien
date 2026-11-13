# Release Notes

[Deutsch](RELEASE_NOTES.md) · **English**

## Version 2026.11.01

Released on 13 November 2026. This release makes the web interface ready for everyday use: videos are created in the background,
errors are explained clearly, and much can be checked in advance. In the video, couples and families now visibly stand together.

### Highlights

- **Video creation in the background** with a progress bar, a preview to play right on the page and a download named after the person.
- **Test connection** and **person search**: pick the main person by searching names in Gramps instead of looking up the Gramps ID.
- **Preview image** of the middle or the ending within seconds, before the whole video is rendered.
- **English interface** with a DE/EN switch, including all error messages.
- **Couples and family blocks in the video:** more room around the main person and their spouse; children-in-law and grandchildren stand right next to their parents.

### Ready-made Docker image

From this version on there is a ready-made image for amd64 and arm64 in the GitHub Container Registry:
[`ghcr.io/edgarm73/lebenslinien`](https://github.com/EdgarM73/LebensLinien/pkgs/container/lebenslinien), tags `2026.11.01` and `latest`.

```bash
docker pull ghcr.io/edgarm73/lebenslinien:2026.11.01
```

With the repository: `docker compose pull && docker compose up -d`. Building it yourself still works with `docker compose up --build -d`.
New images are built automatically for every release.

### The video

- If the main person has a spouse, both get a little more distance from the other lines.
- Spouses of children stand directly next to their partner (on the outside) instead of at the edge, followed by the grandchildren. Each family block gets extra room around it.
- Turkish: "Dede" for grandpa, "Babaanne" or "Anneanne" for grandma depending on the side. Bosnian: revised closing lines.

### Web interface

- Video creation as a background job: no longer cut off behind a reverse proxy, and still visible after reloading the page.
- When the page loads, a notice shows whether your own video or another account's video is being created.
- Clear error messages: person not found, several matches (with Gramps IDs), no birth year, Gramps sign-in failed, server unreachable, server not allowed (with host name).
- "Create video" saves changed settings automatically first.
- New options: hide grandchildren, and the duration of the life story in seconds (20 to 180).
- Account dialog: change password (other devices are signed out) and delete the account.
- Layout fixes (font of the closing text fields, clipped select, "label of the main person" only with "without names").

### Operation and security

- Sessions survive restarts and deploys (stored only as a hash of the token).
- Video jobs interrupted by a restart are reported, orphaned files are cleaned up.
- The sign-in rate limit counts only failed attempts and, with `APP_TRUSTED_PROXIES`, per visitor instead of per reverse proxy.
- New setting `APP_VIDEO_RETENTION_DAYS`: delete videos and preview images after this many days.
- Gramps access retries on "too many requests" (HTTP 429) and loads the people list much faster.

### Command line

- `--still middle` and `--still end` for a still image from the middle or the ending; with `--out image.png` exactly that file is written.
- `"grandchildren": false` and `"seconds": 60` also work in `config_<name>.json`.

### Development

- A GitHub Action runs the tests on every push and renders a still image with sample data.
- 18 tests instead of 6, including sessions, rate limit, account, search and preview image.

### Upgrade notes

- **Reverse proxy:** set `APP_TRUSTED_PROXIES=1` (`2` with two of your own proxies in a row), otherwise the sign-in rate limit counts all visitors together.
- After updating, **redeploy** or restart the server. On the first start with this version all users are signed out once.
- Account passwords: at least 8 characters (the 2026.10.01 documentation wrongly said 12).
- The Turkish and Bosnian texts have still not been proofread by native speakers.

**All changes:** [v2026.10.01…v2026.11.01](https://github.com/EdgarM73/LebensLinien/compare/v2026.10.01...v2026.11.01)

---

## Version 2026.10.01

Released on 29 October 2026. First version of **Lebenslinien (Life Lines)**: it turns one person from Gramps Web into a portrait video
(1080×1920) in which family, friends and colleagues run through time as glowing life lines.

Idea: [@SecretFire79](https://x.com/SecretFire79)

### Highlights

- **Video from Gramps Web:** the family data is read through the REST API and shown as an animation.
  New people swing into the life, people who have died rise as stars, and at the end a constellation with a closing text appears.
- **Web interface** with user accounts, a stored Gramps connection and one-click video creation.
- **Container and local web server:** Docker Compose setup or local start with `npm run web`.
- **Four languages:** German, English, Turkish, Bosnian.
- **Without names:** optionally only relationships appear in the picture ("Me", "Wife", "Son" …), with your own label for the main person (e.g. "Grandpa").

### The video

- The **main person always stays in the centre** and appears at birth. The timeline starts **two years before the birth**.
- **Both sides filled:** father on the left, mother on the right (grandparents on the side of their child); siblings, partners, children
  and grandchildren alternate. The closer the relationship, the closer to the centre: children, partner, parents and grandchildren, siblings, rest.
- **Shown:** grandparents, parents, siblings (including half-siblings), partners, children, grandchildren and their spouses
  (sons-/daughters-in-law). A divorce makes the line drift away.
- **Newborns** (children, siblings, grandchildren) do not sweep in from the side but come into being at their place.
  The space is cleared **10 months before the birth**, the other lines move gently aside.
- **Living lines:** all lines sway gently left and right.
- **Ending:** only people who have **died** become stars and join into a constellation. **The living stay at the bottom**,
  the closing text sits in between and can be customised (title and two lines).
- **Friends, colleagues and other non-relatives** can be added (name or Gramps ID, label, start, optional end;
  with an end the line drifts away or rises as a star).
- Optional **background music** (MP3, WAV, M4A, AAC, OGG, FLAC).
- Very narrow lanes: labels are staggered so nothing overlaps.

### Web interface

- Registration with an invitation code, password of at least 8 characters.
- Gramps credentials are stored **encrypted** (AES-256-GCM), account passwords as scrypt hashes.
- Per account: Gramps connection, main person, language, show names or not, label of the main person, additional people,
  closing text, background music (up to 50 MB) and the most recently created video.
- One video at a time, at most 15 minutes run time, rate limit for failed sign-ins, sessions last 12 hours.

### Command line

- One `config_<name>.json` per main person; the video is named after the person (with "no names": `Lebenslinien.mp4`).
- Handy options: `--demo`, `--still <second>` (a single still image), `--dump` / `--model`, `--seconds`, `--audio`,
  `--lang de|en|tr|bs`, `--size`, `--anonymous`, `--main-label`, `--no-grandchildren`, `--extras`.

### Documentation

- [README.md](README.md) and [ANLEITUNG.md](ANLEITUNG.md) (German) with requirements, container and local web server,
  plus the English versions [README.en.md](README.en.md) and [GUIDE.en.md](GUIDE.en.md).

### Upgrade and operation notes

- There is **no shared `config.json`** any more. Create one `config_<name>.json` per person from `config.example.json`.
- Passwords in the configuration files are stored in plain text. Better use the environment variable `GRAMPS_PASSWORD` or the web interface.
- **Gramps connections need HTTPS** (HTTP only for `localhost`). Internal Docker addresses do not work.
- After an update **restart the server** or rebuild the container (`docker compose up --build -d`), otherwise the old code keeps running.
- Regenerate models saved with `--dump` by earlier development builds, otherwise newer information (sides, birth marker) is missing.
- Backups must contain `data/master.key` together with `data/users.json`.

### Known limitations

- The **Turkish and Bosnian texts** were machine-translated and should be proofread by native speakers.
- The web interface itself is German only.
- People without a date are skipped (note in the log). If the death date of a very old person is missing, an end is estimated.
- The container uses the DejaVu font instead of Georgia/Segoe UI, so the video looks slightly different there.
