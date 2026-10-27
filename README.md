# Lebenslinien

Erzeugt aus einer Person in **Gramps Web** ein Hochformat-Video (1080×1920): Jede Person aus der
engeren Familie ist ein leuchtender Faden. Neue Menschen schwingen in dein Leben (Geburt, Hochzeit),
Verstorbene steigen als Sterne auf, am Ende verbindet sich alles zu einem Sternbild.

**Betrieb als Webserver oder Container:** siehe [ANLEITUNG.md](ANLEITUNG.md) (Voraussetzungen, Docker, lokaler Start, Fehlerhilfe).

## Voraussetzungen
Node.js ≥ 18 und `ffmpeg` im PATH. Einmalig `npm install`.

## Benutzung
Pro Hauptperson gibt es eine eigene Konfigurationsdatei `config_<name>.json` (z. B. `config_opa.json`), die man
aus `config.example.json` kopiert. Darin stehen Zugang (`url`, `username`, Passwort besser über die Umgebungsvariable
`GRAMPS_PASSWORD`), die Hauptperson (`person`: Gramps-ID oder Name) und deren `extras` (Freunde, Kollegen).
Es gibt keine allgemeine config.json.

    node src/index.js config_opa.json

Das Video heißt wie die Person, z. B. `Max Mustermann.mp4` (mit `--out` oder `"out"` in der Konfiguration änderbar).
Bei mehreren Namenstreffern werden die Gramps-IDs aufgelistet; dann `person` auf die ID setzen.

Nützlich: `--demo` (Beispieldaten, ohne Konfiguration), `--still 30` (nur ein PNG bei Sekunde 30), `--dump modell.json` /
`--model modell.json` (Daten prüfen oder von Hand korrigieren), `--seconds`, `--audio musik.mp3`,
`--lang en`, `--size 720x1280`, `--no-grandchildren`, `--anonymous` (ohne Namen: nur "Ich", "Ehefrau", "Sohn" …; in der Konfiguration `"anonymous": true`).

## Sprache

`"lang"` in der Konfiguration oder `--lang` auf der Kommandozeile: `de` (Deutsch, Standard), `en` (English), `tr` (Türkçe),
`bs` (Bosanski). Das betrifft Verwandtschaftsbezeichnungen, „Ich“, die Altersanzeige und den Schlusstext. Alle Texte stehen in
`src/i18n.js`, dort lässt sich auch eine weitere Sprache ergänzen. Der Schlusstext lässt sich pro Person mit `"texts"` überschreiben.

Bei `extras` kann `"rel"` ein fester Text sein, `"friend"` / `"colleague"` (wird übersetzt) oder je Sprache angegeben werden:
`"rel": {"de": "Nachbar", "tr": "Komşu", "bs": "Komšija"}`.

## Freunde, Kollegen und andere Nicht-Verwandte
In der `config_<name>.json` unter `"extras"` (oder per `--extras datei.json`) eintragen:

- `name`, `rel` (Beschriftung, z. B. "Freund"), `start` (Jahr oder "1988-03", ab dem die Person im Leben vorkommt) – Pflicht.
- `end` (optional): ohne Angabe bleibt die Person bis zum Schluss. Mit `end` driftet die Linie weg (Kontakt eingeschlafen);
  mit `"exit": "star"` steigt sie als Stern auf (verstorben).
- Statt `name` geht auch `"id": "I0123"`: Name (und ein Sterbedatum, dann als Stern) kommen aus Gramps.

Die Hauptperson bleibt immer in der Bildmitte: Großeltern, Eltern und Geschwister laufen links, Partner, Kinder
und Enkel rechts, Freunde abwechselnd ganz außen.

## Web-Oberfläche

Neben der Kommandozeile gibt es eine lokale Web-Oberfläche für mehrere Nutzerkonten. Sie verwaltet pro Konto die Gramps-Verbindung, Hauptperson und Zusatzpersonen und startet die Videoerzeugung.

  npm run web

Anschließend `http://127.0.0.1:3000` öffnen. Node.js 18 oder neuer, `npm install` und `ffmpeg` im PATH werden benötigt. Neue Konten brauchen ein Passwort mit mindestens 12 Zeichen. Zum Schutz vor offenen Registrierungen kann vor dem Start ein Einladungscode gesetzt werden:

  $env:APP_REGISTRATION_KEY = "ein-langer-zufaelliger-code"
  npm run web

  Im Dashboard kann pro Konto eine optionale Hintergrundmusik hochgeladen und wieder entfernt werden. Unterstützt werden MP3, WAV, M4A, AAC, OGG und FLAC bis 50 MB. Die Datei wird unter `data/audio/` gespeichert und beim nächsten Video-Rendern verwendet. Außerdem lassen sich Titel und beide Zeilen des Schlusstexts bearbeiten; beim Wechsel der Videosprache werden die passenden Texte aus der Übersetzungstabelle vorgeschlagen.

Die Web-App bindet standardmäßig nur an `127.0.0.1`. Nutzer, Konfigurationen, Videos und der lokale Schlüssel zur Verschlüsselung liegen unter `data/`; dieser Ordner ist von Git ausgeschlossen. Backups müssen `data/master.key` zusammen mit `data/users.json` enthalten, sonst lassen sich gespeicherte Gramps-Passwörter nicht mehr entschlüsseln. Für einen extern erreichbaren Betrieb sollte `APP_KEY` (Base64-kodierte 32 Bytes) über die Umgebung bereitgestellt und getrennt gesichert werden.

Die Passwörter für Gramps werden mit AES-256-GCM verschlüsselt, Kontopasswörter werden als scrypt-Hashes abgelegt. Gramps-Verbindungen müssen HTTPS verwenden; HTTP ist nur für `localhost` zugelassen. Die Web-Oberfläche sollte nicht ungeschützt im Internet veröffentlicht werden. Für externen Zugriff sind mindestens ein HTTPS-Reverse-Proxy, `COOKIE_SECURE=true`, ein `APP_REGISTRATION_KEY`, ein stark geschützter Host und eine Begrenzung der erlaubten Gramps-Server erforderlich. Die Hostnamen dafür lassen sich kommasepariert in `APP_ALLOWED_GRAMPS_HOSTS` eintragen. Sitzungen sind 12 Stunden gültig und werden beim Neustart des Servers verworfen.

## Docker
Voraussetzung ist Docker mit Docker Compose. Im Projektordner eine `.env` aus der Vorlage erstellen und den Einladungscode durch einen langen, zufälligen Wert ersetzen:

  cp .env.example .env
  docker compose up --build -d

Unter Windows PowerShell kann die Vorlage so kopiert werden: `Copy-Item .env.example .env`. Anschließend ist die Anwendung unter `http://localhost:3000` erreichbar. Der Container bindet den Port standardmäßig nur an den lokalen Rechner; für externen Zugriff einen HTTPS-Reverse-Proxy verwenden und in `.env` `COOKIE_SECURE=true` setzen. Bei Bedarf lässt sich der lokale Port über `PORT` ändern.

Benutzer, Videos, Musik und der Verschlüsselungsschlüssel liegen im persistenten Docker-Volume `lebenslinien_lebenslinien_data`. `docker compose down` erhält diese Daten; `docker compose down -v` löscht das Volume unwiderruflich. Für Backups das Volume sichern.

## Was dargestellt wird
Großeltern, Eltern, Geschwister (auch Halbgeschwister), Partner (bei Scheidung driftet die Linie weg),
Kinder und Enkel samt deren Ehepartnern (Schwiegersohn/-tochter). Zeitachse = Lebensalter der Hauptperson. Ereignisse ohne Datum werden übersprungen
und beim Start als Hinweis ausgegeben.

## Tests
Die lokale Testsuite liest `test-stammbaum-huber.ged` und prüft die Familiengruppen des erzeugten Modells:

  npm test

Für den optionalen Live-Test muss derselbe Stammbaum in Gramps Web importiert sein. Zugangsdaten gehören in
die lokal ignorierte `config_test.json` (Vorlage: URL `https://grampsweb.apps.mw29.de`, Felder `username` und
`password`) oder in `GRAMPS_TEST_USERNAME` und `GRAMPS_TEST_PASSWORD`. Mit gesetzten Zugangsdaten fragt der
Live-Test die Gramps-Web-API ausschließlich lesend ab.
