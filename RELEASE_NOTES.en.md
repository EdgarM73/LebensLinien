# Release Notes – Version 2026.10.01

[Deutsch](RELEASE_NOTES.md) · **English**

Released on 29 October 2026. First version of **Lebenslinien (Life Lines)**: it turns one person from Gramps Web into a portrait video
(1080×1920) in which family, friends and colleagues run through time as glowing life lines.

Idea: [@SecretFire79](https://x.com/SecretFire79)

## Highlights

- **Video from Gramps Web:** the family data is read through the REST API and shown as an animation.
  New people swing into the life, people who have died rise as stars, and at the end a constellation with a closing text appears.
- **Web interface** with user accounts, a stored Gramps connection and one-click video creation.
- **Container and local web server:** Docker Compose setup or local start with `npm run web`.
- **Four languages:** German, English, Turkish, Bosnian.
- **Without names:** optionally only relationships appear in the picture ("Me", "Wife", "Son" …), with your own label for the main person (e.g. "Grandpa").

## The video

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

## Web interface

- Registration with an invitation code, password of at least 12 characters.
- Gramps credentials are stored **encrypted** (AES-256-GCM), account passwords as scrypt hashes.
- Per account: Gramps connection, main person, language, show names or not, label of the main person, additional people,
  closing text, background music (up to 50 MB) and the most recently created video.
- One video at a time, at most 15 minutes run time, rate limit for failed sign-ins, sessions last 12 hours.

## Command line

- One `config_<name>.json` per main person; the video is named after the person (with "no names": `Lebenslinien.mp4`).
- Handy options: `--demo`, `--still <second>` (a single still image), `--dump` / `--model`, `--seconds`, `--audio`,
  `--lang de|en|tr|bs`, `--size`, `--anonymous`, `--main-label`, `--no-grandchildren`, `--extras`.

## Documentation

- [README.md](README.md) and [ANLEITUNG.md](ANLEITUNG.md) (German) with requirements, container and local web server,
  plus the English versions [README.en.md](README.en.md) and [GUIDE.en.md](GUIDE.en.md).

## Upgrade and operation notes

- There is **no shared `config.json`** any more. Create one `config_<name>.json` per person from `config.example.json`.
- Passwords in the configuration files are stored in plain text. Better use the environment variable `GRAMPS_PASSWORD` or the web interface.
- **Gramps connections need HTTPS** (HTTP only for `localhost`). Internal Docker addresses do not work.
- After an update **restart the server** or rebuild the container (`docker compose up --build -d`), otherwise the old code keeps running.
- Regenerate models saved with `--dump` by earlier development builds, otherwise newer information (sides, birth marker) is missing.
- Backups must contain `data/master.key` together with `data/users.json`.

## Known limitations

- The **Turkish and Bosnian texts** were machine-translated and should be proofread by native speakers.
- The web interface itself is German only.
- People without a date are skipped (note in the log). If the death date of a very old person is missing, an end is estimated.
- The container uses the DejaVu font instead of Georgia/Segoe UI, so the video looks slightly different there.
