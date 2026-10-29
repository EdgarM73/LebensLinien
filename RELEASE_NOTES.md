# Release Notes – Version 2026.10.01

**Deutsch** · [English](RELEASE_NOTES.en.md)

Veröffentlicht am 29. Oktober 2026. Erste Version von **Lebenslinien**: Aus einer Person in Gramps Web entsteht ein Hochformat-Video
(1080×1920), in dem Familie, Freunde und Kollegen als leuchtende Lebenslinien durch die Zeit laufen.

Idee: [@SecretFire79](https://x.com/SecretFire79)

## Highlights

- **Video aus Gramps Web:** Die Familiendaten werden über die REST-API gelesen und als Animation dargestellt.
  Neue Menschen schwingen ins Leben, Verstorbene steigen als Sterne auf, am Ende entsteht ein Sternbild mit Schlusstext.
- **Weboberfläche** mit Benutzerkonten, gespeicherter Gramps-Verbindung und Videoerstellung per Klick.
- **Container und lokaler Webserver:** Docker-Compose-Setup oder lokaler Start mit `npm run web`.
- **Vier Sprachen:** Deutsch, English, Türkçe, Bosanski.
- **Ohne Namen:** Wahlweise nur Beziehungen im Bild („Ich“, „Ehefrau“, „Sohn“ …), die Hauptperson mit eigener Bezeichnung (z. B. „Opa“).

## Das Video

- Die **Hauptperson steht immer in der Bildmitte** und erscheint mit ihrer Geburt. Die Zeitleiste beginnt **zwei Jahre vor der Geburt**.
- **Beide Seiten gefüllt:** Vater links, Mutter rechts (Großeltern auf der Seite ihres Kindes); Geschwister, Partner, Kinder und Enkel
  wechseln sich ab. Je enger die Beziehung, desto näher an der Mitte: Kinder, Partner, Eltern und Enkel, Geschwister, Rest.
- **Dargestellt werden** Großeltern, Eltern, Geschwister (auch Halbgeschwister), Partner, Kinder, Enkel und deren Ehepartner
  (Schwiegersohn/-tochter). Eine Scheidung lässt die Linie wegdriften.
- **Neugeborene** (Kinder, Geschwister, Enkel) fahren nicht von der Seite herein, sondern entstehen an ihrem Platz.
  Der Platz wird **10 Monate vor der Geburt** freigemacht, die anderen Linien rücken sanft zur Seite.
- **Lebendige Linien:** Alle Linien pendeln leicht nach links und rechts.
- **Schluss:** Nur **Verstorbene** werden zu Sternen und verbinden sich zu einem Sternbild. Die **noch Lebenden bleiben unten**,
  der Schlusstext steht dazwischen und lässt sich anpassen (Titel und zwei Zeilen).
- **Freunde, Kollegen und andere Nicht-Verwandte** lassen sich ergänzen (Name oder Gramps-ID, Bezeichnung, Start, optional Ende;
  mit Ende driftet die Linie weg oder steigt als Stern auf).
- Optional **Hintergrundmusik** (MP3, WAV, M4A, AAC, OGG, FLAC).
- Sehr enge Bahnen: Beschriftungen werden versetzt, damit nichts überlappt.

## Weboberfläche

- Registrierung mit Einladungscode, Passwort mindestens 12 Zeichen.
- Gramps-Zugangsdaten werden **verschlüsselt** (AES-256-GCM) gespeichert, Kontopasswörter als scrypt-Hash.
- Pro Konto: Gramps-Verbindung, Hauptperson, Sprache, Namen anzeigen oder nicht, Bezeichnung der Hauptperson, Zusatzpersonen,
  Schlusstext, Hintergrundmusik (bis 50 MB) und das zuletzt erstellte Video.
- Ein Video gleichzeitig, höchstens 15 Minuten Laufzeit, Begrenzung falscher Anmeldeversuche, Sitzungen 12 Stunden.

## Kommandozeile

- Pro Hauptperson eine eigene `config_<name>.json`, das Video heißt wie die Person (bei „ohne Namen“: `Lebenslinien.mp4`).
- Praktische Optionen: `--demo`, `--still <Sekunde>` (nur ein Standbild), `--dump` / `--model`, `--seconds`, `--audio`,
  `--lang de|en|tr|bs`, `--size`, `--anonymous`, `--main-label`, `--no-grandchildren`, `--extras`.

## Dokumentation

- [README.md](README.md) und [ANLEITUNG.md](ANLEITUNG.md) mit Voraussetzungen, Container und lokalem Webserver,
  dazu die englischen Fassungen [README.en.md](README.en.md) und [GUIDE.en.md](GUIDE.en.md).

## Hinweise zum Umstieg und zum Betrieb

- Es gibt **keine allgemeine `config.json`** mehr. Pro Person eine `config_<name>.json` aus `config.example.json` anlegen.
- Die Passwörter in den Konfigurationsdateien liegen im Klartext. Besser die Umgebungsvariable `GRAMPS_PASSWORD` nutzen oder die Weboberfläche.
- **Gramps-Verbindungen brauchen HTTPS** (HTTP nur für `localhost`). Interne Docker-Adressen funktionieren nicht.
- Nach einem Update den Server **neu starten** bzw. den Container neu bauen (`docker compose up --build -d`), sonst läuft der alte Code weiter.
- Mit `--dump` gespeicherte Modelle früherer Entwicklungsstände neu erzeugen, sonst fehlen neuere Informationen (Seiten, Geburtsmarkierung).
- Backups müssen `data/master.key` zusammen mit `data/users.json` enthalten.

## Bekannte Einschränkungen

- Die **türkischen und bosnischen Texte** wurden maschinell übersetzt und sollten von Muttersprachlern gegengelesen werden.
- Die Weboberfläche selbst ist nur auf Deutsch.
- Personen ohne Datum werden übersprungen (Hinweis im Protokoll). Fehlt das Sterbedatum bei sehr alten Personen, wird ein Ende geschätzt.
- Im Container wird die Schrift DejaVu statt Georgia/Segoe UI verwendet, das Video sieht dort etwas anders aus.
