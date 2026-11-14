// Meldungen der Weboberfläche auf Englisch. Der Server formuliert auf Deutsch; hat die Oberfläche
// Englisch gewählt (Header X-UI-Lang: en), wird die Meldung hier vor dem Senden übersetzt.
// Fehlt ein Eintrag, bleibt der deutsche Text stehen.

const EN = {
  'Der Server wurde während der Videoerstellung neu gestartet. Bitte das Video erneut erstellen.': 'The server restarted while the video was being created. Please create the video again.',
  'Anfrage ist zu groß.': 'The request is too large.',
  'Die Audiodatei darf höchstens 50 MB groß sein.': 'The audio file may be 50 MB at most.',
  'Die Audiodatei ist leer.': 'The audio file is empty.',
  'Ungültiger Dateiname.': 'Invalid file name.',
  'Bitte eine gültige MP3-, WAV-, M4A-, AAC-, OGG- oder FLAC-Datei auswählen.': 'Please choose a valid MP3, WAV, M4A, AAC, OGG or FLAC file.',
  'Bitte eine gültige Gramps-URL angeben.': 'Please enter a valid Gramps URL.',
  'Zugangsdaten gehören nicht in die Server-URL.': 'Credentials do not belong in the server URL.',
  'Für Gramps-Verbindungen ist HTTPS erforderlich (außer lokalem localhost).': 'Gramps connections require HTTPS (except local localhost).',
  'Bitte Benutzername und Passwort für Gramps eintragen.': 'Please enter the user name and password for Gramps.',
  'Ein Eingabefeld ist zu lang.': 'One of the fields is too long.',
  'Die Abfrage bei Gramps ist fehlgeschlagen. Bitte Server-URL und Zugangsdaten prüfen.': 'The request to Gramps failed. Please check the server URL and the credentials.',
  'URL, Benutzername, Hauptperson und Passwort sind erforderlich.': 'URL, user name, main person and password are required.',
  'Es können höchstens 200 Zusatzpersonen gespeichert werden.': 'At most 200 additional people can be stored.',
  'Jede Zusatzperson braucht einen Namen oder eine Gramps-ID.': 'Every additional person needs a name or a Gramps ID.',
  'Der Titel darf 120, jede Schlusszeile 180 Zeichen lang sein.': 'The title may have 120 characters, each closing line 180.',
  'Die Dauer muss eine ganze Zahl zwischen 20 und 180 Sekunden sein (leer = automatisch).': 'The duration must be a whole number between 20 and 180 seconds (empty = automatic).',
  'Das Video konnte nicht erstellt werden. Bitte Verbindung und Gramps-Daten prüfen.': 'The video could not be created. Please check the connection and the Gramps data.',
  'Die Erzeugung hat das Zeitlimit überschritten.': 'The creation exceeded the time limit.',
  'Die Hauptperson wurde in Gramps nicht gefunden. Bitte Namen oder Gramps-ID prüfen.': 'The main person was not found in Gramps. Please check the name or Gramps ID.',
  'Für die Hauptperson ist in Gramps kein Geburtsjahr hinterlegt. Bitte ein Geburtsereignis mit Datum anlegen.': 'The main person has no birth year in Gramps. Please add a birth event with a date.',
  'Die Anmeldung bei Gramps ist fehlgeschlagen. Bitte Benutzername und Passwort prüfen.': 'Signing in to Gramps failed. Please check the user name and password.',
  'Gramps nimmt gerade keine weiteren Anfragen an (zu viele in kurzer Zeit). Bitte einen Moment warten und erneut versuchen.': 'Gramps is not accepting more requests right now (too many in a short time). Please wait a moment and try again.',
  'Dieser Gramps-Benutzer darf die Stammbaumdaten nicht lesen.': 'This Gramps user is not allowed to read the family tree data.',
  'Der Gramps-Server ist von hier aus nicht erreichbar. Bitte die Server-URL prüfen.': 'The Gramps server cannot be reached from here. Please check the server URL.',
  'Unter dieser Adresse antwortet kein Gramps Web. Bitte die Server-URL prüfen.': 'No Gramps Web answers at this address. Please check the server URL.',
  'Die gespeicherte Audiodatei wurde nicht gefunden. Bitte die Musik neu hochladen.': 'The stored audio file was not found. Please upload the music again.',
  'Unbekannte Sprache.': 'Unknown language.',
  'Bitte zuerst eine GEDCOM-Datei hochladen.': 'Please upload a GEDCOM file first.',
  'Bitte die Hauptperson angeben.': 'Please enter the main person.',
  'Die GEDCOM-Datei darf höchstens 50 MB groß sein.': 'The GEDCOM file may be 50 MB at most.',
  'Die GEDCOM-Datei ist leer.': 'The GEDCOM file is empty.',
  'Die GEDCOM-Datei wurde nicht gefunden. Bitte erneut hochladen.': 'The GEDCOM file was not found. Please upload it again.',
  'Die Datei enthält keine Personen. Bitte eine GEDCOM-Datei (.ged) hochladen.': 'The file contains no people. Please upload a GEDCOM file (.ged).',
  'Ungültige Herkunft der Anfrage.': 'Invalid request origin.',
  'Zu viele Versuche. Bitte später erneut probieren.': 'Too many attempts. Please try again later.',
  'Benutzername oder Passwort ist zu lang.': 'The user name or password is too long.',
  'Einladungscode ist ungültig.': 'The invitation code is invalid.',
  'Benutzername: 3–40 Zeichen. Passwort: mindestens 8 Zeichen.': 'User name: 3–40 characters. Password: at least 8 characters.',
  'Benutzername ist bereits vergeben.': 'This user name is already taken.',
  'Anmeldung fehlgeschlagen.': 'Sign-in failed.',
  'Das Passwort muss 8–256 Zeichen lang sein.': 'The password must have 8–256 characters.',
  'Der Reset-Link ist ungültig oder abgelaufen.': 'The reset link is invalid or has expired.',
  'Bitte zuerst anmelden.': 'Please sign in first.',
  'Das aktuelle Passwort stimmt nicht.': 'The current password is wrong.',
  'Gerade wird ein Video oder Vorschaubild erstellt. Bitte danach erneut versuchen.': 'A video or preview image is being created right now. Please try again afterwards.',
  'Während der Videoerstellung kann die Musik nicht geändert werden.': 'The music cannot be changed while a video is being created.',
  'Für diesen Nutzer läuft bereits eine Videoerzeugung.': 'A video is already being created for this user.',
  'Derzeit wird bereits ein Video erstellt. Bitte später erneut versuchen.': 'Another video is being created at the moment. Please try again later.',
  'Bitte zuerst die Verbindungsdaten speichern.': 'Please save the connection details first.',
  'Es wird bereits ein Vorschaubild erstellt.': 'A preview image is already being created.',
  'Der Server ist gerade ausgelastet. Bitte gleich noch einmal versuchen.': 'The server is busy right now. Please try again in a moment.',
  'Das Vorschaubild konnte nicht erstellt werden. Bitte Verbindung und Gramps-Daten prüfen.': 'The preview image could not be created. Please check the connection and the Gramps data.',
  'Noch kein Vorschaubild vorhanden.': 'There is no preview image yet.',
  'Noch kein Video vorhanden.': 'There is no video yet.',
  'Video wurde nicht gefunden.': 'The video was not found.',
  'Nicht gefunden.': 'Not found.',
  'Ungültige Anfrage.': 'Invalid request.',
  'Interner Serverfehler.': 'Internal server error.',
};

// Meldungen mit eingesetzten Werten
const PATTERNS = [
  [/^Der Gramps-Server „(.+)“ ist auf diesem Server nicht freigegeben \(Einstellung APP_ALLOWED_GRAMPS_HOSTS\)\.$/, 'The Gramps server "$1" is not allowed on this server (setting APP_ALLOWED_GRAMPS_HOSTS).'],
  [/^Ungültiges Startjahr bei (.+)\.$/, 'Invalid start year for $1.'],
  [/^Ungültiges Endjahr bei (.+)\.$/, 'Invalid end year for $1.'],
  [/^Mehrere Personen passen zur Hauptperson\. Bitte die Gramps-ID eintragen(.*)$/, 'Several people match the main person. Please enter the Gramps ID$1'],
];

export function translateMessage(text, lang) {
  if (lang !== 'en' || typeof text !== 'string') return text;
  if (EN[text]) return EN[text];
  for (const [pattern, replacement] of PATTERNS) if (pattern.test(text)) return text.replace(pattern, replacement);
  return text;
}

export const MESSAGES_EN = EN;
