# Release Notes

**Deutsch** · [English](RELEASE_NOTES.en.md)

## Version 2026.11.01

Veröffentlicht am 13. November 2026. Dieses Release macht die Weboberfläche alltagstauglich: Videos entstehen im Hintergrund,
Fehler werden verständlich erklärt, und vieles lässt sich vorab prüfen. Im Video stehen Paare und Familien jetzt sichtbar zusammen.

### Highlights

- **Videoerstellung im Hintergrund** mit Fortschrittsbalken, Vorschau zum Abspielen direkt auf der Seite und Download mit dem Namen der Person.
- **Verbindung testen** und **Personensuche**: Hauptperson per Namenssuche aus Gramps auswählen, statt die Gramps-ID nachzuschlagen.
- **Vorschaubild** von Mitte oder Schluss in wenigen Sekunden, bevor das ganze Video gerendert wird.
- **Oberfläche auf Englisch** mit Umschalter DE/EN, auch für alle Fehlermeldungen.
- **Paare und Familienblöcke im Video:** mehr Platz um die Hauptperson und ihren Ehepartner; Schwiegerkinder und Enkel stehen direkt bei ihren Eltern.

### Das Video

- Hat die Hauptperson einen Ehepartner, bekommen beide etwas mehr Abstand zu den übrigen Linien.
- Ehepartner von Kindern stehen direkt neben ihrem Partner (außen) statt am Rand, die Enkel schließen sich an. Um jeden Familienblock gibt es zusätzlichen Platz.
- Türkisch: „Dede“ für den Opa, „Babaanne“ bzw. „Anneanne“ für die Oma je nach Seite. Bosnisch: überarbeitete Schlusszeilen.

### Weboberfläche

- Videoerstellung als Hintergrundauftrag: bricht hinter einem Reverse Proxy nicht mehr ab und läuft nach dem Neuladen der Seite sichtbar weiter.
- Beim Laden der Seite zeigt ein Hinweis, ob das eigene Video oder das eines anderen Kontos gerade entsteht.
- Verständliche Fehlermeldungen: Person nicht gefunden, mehrere Treffer (mit Gramps-IDs), kein Geburtsjahr, Anmeldung bei Gramps fehlgeschlagen, Server nicht erreichbar, Server nicht freigegeben (mit Hostname).
- „Video erstellen“ speichert geänderte Einstellungen vorher automatisch.
- Neue Optionen: Enkel ausblenden und Dauer des Lebenslaufs in Sekunden (20 bis 180).
- Konto-Dialog: Passwort ändern (andere Geräte werden abgemeldet) und Konto löschen.
- Darstellungsfehler behoben (Schrift der Schlusstext-Felder, abgeschnittene Auswahl, Feld „Bezeichnung der Hauptperson“ nur bei „Ohne Namen“).

### Betrieb und Sicherheit

- Sitzungen überstehen Neustarts und Deploys (gespeichert nur als Hash des Tokens).
- Durch einen Neustart abgebrochene Videoaufträge werden gemeldet, verwaiste Dateien aufgeräumt.
- Die Anmeldebegrenzung zählt nur Fehlversuche und mit `APP_TRUSTED_PROXIES` je Besucher statt je Reverse Proxy.
- Neue Einstellung `APP_VIDEO_RETENTION_DAYS`: Videos und Vorschaubilder nach so vielen Tagen löschen.
- Der Gramps-Zugriff wiederholt Anfragen bei „zu viele Anfragen“ (HTTP 429) und lädt die Personenliste deutlich schneller.

### Kommandozeile

- `--still middle` und `--still end` für ein Standbild aus der Mitte bzw. vom Schluss; mit `--out bild.png` wird genau diese Datei geschrieben.
- `"grandchildren": false` und `"seconds": 60` gelten auch in `config_<name>.json`.

### Entwicklung

- Eine GitHub Action führt bei jedem Push die Tests aus und rendert ein Standbild mit Beispieldaten.
- 18 Tests statt 6, darunter Sitzungen, Anmeldebegrenzung, Konto, Suche und Vorschaubild.

### Hinweise zum Update

- **Reverse Proxy:** `APP_TRUSTED_PROXIES=1` setzen (bei zwei eigenen Proxys hintereinander `2`), sonst zählt die Anmeldebegrenzung alle Besucher zusammen.
- Nach dem Update **neu deployen** bzw. den Server neu starten. Beim ersten Start mit dieser Version werden alle Nutzer einmal abgemeldet.
- Kontopasswörter: mindestens 8 Zeichen (die Doku von 2026.10.01 nannte fälschlich 12).
- Die türkischen und bosnischen Texte sind weiterhin nicht von Muttersprachlern gegengelesen.

**Alle Änderungen:** [v2026.10.01…v2026.11.01](https://github.com/EdgarM73/LebensLinien/compare/v2026.10.01...v2026.11.01)

---

## Version 2026.10.01

Veröffentlicht am 29. Oktober 2026. Erste Version von **Lebenslinien**: Aus einer Person in Gramps Web entsteht ein Hochformat-Video
(1080×1920), in dem Familie, Freunde und Kollegen als leuchtende Lebenslinien durch die Zeit laufen.

Idee: [@SecretFire79](https://x.com/SecretFire79)

### Highlights

- **Video aus Gramps Web:** Die Familiendaten werden über die REST-API gelesen und als Animation dargestellt.
  Neue Menschen schwingen ins Leben, Verstorbene steigen als Sterne auf, am Ende entsteht ein Sternbild mit Schlusstext.
- **Weboberfläche** mit Benutzerkonten, gespeicherter Gramps-Verbindung und Videoerstellung per Klick.
- **Container und lokaler Webserver:** Docker-Compose-Setup oder lokaler Start mit `npm run web`.
- **Vier Sprachen:** Deutsch, English, Türkçe, Bosanski.
- **Ohne Namen:** Wahlweise nur Beziehungen im Bild („Ich“, „Ehefrau“, „Sohn“ …), die Hauptperson mit eigener Bezeichnung (z. B. „Opa“).

### Das Video

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

### Weboberfläche

- Registrierung mit Einladungscode, Passwort mindestens 8 Zeichen.
- Gramps-Zugangsdaten werden **verschlüsselt** (AES-256-GCM) gespeichert, Kontopasswörter als scrypt-Hash.
- Pro Konto: Gramps-Verbindung, Hauptperson, Sprache, Namen anzeigen oder nicht, Bezeichnung der Hauptperson, Zusatzpersonen,
  Schlusstext, Hintergrundmusik (bis 50 MB) und das zuletzt erstellte Video.
- Ein Video gleichzeitig, höchstens 15 Minuten Laufzeit, Begrenzung falscher Anmeldeversuche, Sitzungen 12 Stunden.

### Kommandozeile

- Pro Hauptperson eine eigene `config_<name>.json`, das Video heißt wie die Person (bei „ohne Namen“: `Lebenslinien.mp4`).
- Praktische Optionen: `--demo`, `--still <Sekunde>` (nur ein Standbild), `--dump` / `--model`, `--seconds`, `--audio`,
  `--lang de|en|tr|bs`, `--size`, `--anonymous`, `--main-label`, `--no-grandchildren`, `--extras`.

### Dokumentation

- [README.md](README.md) und [ANLEITUNG.md](ANLEITUNG.md) mit Voraussetzungen, Container und lokalem Webserver,
  dazu die englischen Fassungen [README.en.md](README.en.md) und [GUIDE.en.md](GUIDE.en.md).

### Hinweise zum Umstieg und zum Betrieb

- Es gibt **keine allgemeine `config.json`** mehr. Pro Person eine `config_<name>.json` aus `config.example.json` anlegen.
- Die Passwörter in den Konfigurationsdateien liegen im Klartext. Besser die Umgebungsvariable `GRAMPS_PASSWORD` nutzen oder die Weboberfläche.
- **Gramps-Verbindungen brauchen HTTPS** (HTTP nur für `localhost`). Interne Docker-Adressen funktionieren nicht.
- Nach einem Update den Server **neu starten** bzw. den Container neu bauen (`docker compose up --build -d`), sonst läuft der alte Code weiter.
- Mit `--dump` gespeicherte Modelle früherer Entwicklungsstände neu erzeugen, sonst fehlen neuere Informationen (Seiten, Geburtsmarkierung).
- Backups müssen `data/master.key` zusammen mit `data/users.json` enthalten.

### Bekannte Einschränkungen

- Die **türkischen und bosnischen Texte** wurden maschinell übersetzt und sollten von Muttersprachlern gegengelesen werden.
- Die Weboberfläche selbst ist nur auf Deutsch.
- Personen ohne Datum werden übersprungen (Hinweis im Protokoll). Fehlt das Sterbedatum bei sehr alten Personen, wird ein Ende geschätzt.
- Im Container wird die Schrift DejaVu statt Georgia/Segoe UI verwendet, das Video sieht dort etwas anders aus.
