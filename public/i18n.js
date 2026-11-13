// Sprache der Oberfläche (Deutsch oder Englisch). Die Seite und app.js sind auf Deutsch geschrieben;
// bei Englisch werden Texte und Attribute anhand dieser Tabelle ersetzt, auch solche, die app.js
// später einsetzt (MutationObserver). Fehlt ein Eintrag, bleibt der deutsche Text stehen.
// Meldungen des Servers kommen bereits übersetzt an (Header X-UI-Lang, siehe src/messages.js).

const UI_EN = {
  // Kopf und Anmeldung
  'Lebenslinien | Gramps-Video': 'Lebenslinien | Gramps video',
  'Lebenslinien Startseite': 'Lebenslinien home',
  'Sprache der Oberfläche': 'Interface language',
  'Konto': 'Account',
  'Abmelden': 'Sign out',
  'Gramps Web · persönliche Geschichten': 'Gramps Web · personal stories',
  'Ein Leben.': 'One life.',
  'Viele Verbindungen.': 'Many connections.',
  'Verbinde deinen Stammbaum und gestalte daraus ein persönliches Lebenslinien-Video.': 'Connect your family tree and turn it into a personal life-lines video.',
  'Anmelden': 'Sign in',
  'Konto erstellen': 'Create account',
  'Benutzername': 'User name',
  'Passwort': 'Password',
  'Einladungscode': 'Invitation code',
  'Neues Passwort': 'New password',
  'Passwort wiederholen': 'Repeat password',
  'Passwort speichern': 'Save password',
  'Passwort geändert. Du kannst dich jetzt anmelden.': 'Password changed. You can sign in now.',
  'Deine Verbindungsdaten bleiben verschlüsselt auf diesem Server.': 'Your connection details stay encrypted on this server.',
  'Passwort vergessen? Bitte den Admin um einen Reset-Link bitten.': 'Forgot your password? Ask the admin for a reset link.',
  'Passwort mindestens 8 Zeichen. Zugangsdaten werden verschlüsselt gespeichert.': 'Password of at least 8 characters. Credentials are stored encrypted.',
  'Die Passwörter stimmen nicht überein.': 'The passwords do not match.',

  // Konto-Dialog
  'Schließen': 'Close',
  'Passwort ändern': 'Change password',
  'Aktuelles Passwort': 'Current password',
  'Mindestens 8 Zeichen. Andere Geräte werden dabei abgemeldet.': 'At least 8 characters. Other devices are signed out.',
  'Das Passwort wurde geändert.': 'The password has been changed.',
  'Konto löschen': 'Delete account',
  'Löscht dein Konto mit allen Einstellungen, der Musik und dem Video. Das lässt sich nicht rückgängig machen.': 'Deletes your account with all settings, the music and the video. This cannot be undone.',
  'Passwort zur Bestätigung': 'Password to confirm',
  'Konto endgültig löschen': 'Delete account permanently',

  // Einrichtung
  'Dein Studio': 'Your studio',
  'Video einrichten': 'Set up your video',
  'Noch nicht eingerichtet': 'Not set up yet',
  'Verbindung eingerichtet': 'Connection set up',
  'Gramps-Verbindung': 'Gramps connection',
  'Deine Zugangsdaten werden verschlüsselt gespeichert.': 'Your credentials are stored encrypted.',
  'Server-URL': 'Server URL',
  'Passwort eingeben': 'Enter password',
  'Wird verschlüsselt gespeichert.': 'Stored encrypted.',
  'Passwort gespeichert. Leer lassen, um es beizubehalten.': 'Password stored. Leave empty to keep it.',
  'Verbindung testen': 'Test connection',
  'Verbindung wird geprüft …': 'Checking the connection …',
  'Hauptperson': 'Main person',
  'Name eintippen oder Gramps-ID': 'Type a name or Gramps ID',
  'Gefundene Personen': 'People found',
  'Ab zwei Buchstaben erscheinen passende Personen aus Gramps. Eine Gramps-ID ist eindeutig, z. B. I0044.': 'From two letters on, matching people from Gramps appear. A Gramps ID is unique, e.g. I0044.',
  '(ohne Namen)': '(no name)',
  'Keine passende Person gefunden.': 'No matching person found.',
  'Für die Suche zuerst Server-URL, Benutzername und Passwort eintragen.': 'To search, first enter the server URL, user name and password.',
  'Suche in Gramps …': 'Searching Gramps …',
  'Videosprache': 'Video language',
  'Namen': 'Names',
  'Mit Namen': 'With names',
  'Ohne Namen (Ich, Ehefrau, Sohn …)': 'Without names (Me, Wife, Son …)',
  'Bezeichnung der Hauptperson': 'Label of the main person',
  'z. B. Opa, Mama, Ich': 'e.g. Grandpa, Mom, Me',
  'Leer = „Ich“.': 'Empty = "Me".',
  'Enkel': 'Grandchildren',
  'Enkel und ihre Partner zeigen': 'Show grandchildren and their partners',
  'Ohne Enkel': 'Without grandchildren',
  'Dauer in Sekunden': 'Duration in seconds',
  'automatisch': 'automatic',
  'Länge des Lebenslaufs, dazu kommen 11 Sekunden Schluss. Leer = automatisch (32 bis 75).': 'Length of the life story; the ending adds 11 seconds. Empty = automatic (32 to 75).',
  'Hintergrundmusik': 'Background music',
  'Entfernen': 'Remove',
  'Optional · MP3, WAV, M4A, AAC, OGG oder FLAC · maximal 50 MB': 'Optional · MP3, WAV, M4A, AAC, OGG or FLAC · 50 MB at most',
  'Musik wird hochgeladen …': 'Uploading music …',
  'Upload fehlgeschlagen.': 'Upload failed.',

  // Weitere Menschen
  'Weitere Menschen': 'More people',
  'Freunde, Kolleginnen und andere wichtige Wegbegleiter. Mit Enddatum: wegdriften oder als Stern aufsteigen.': 'Friends, colleagues and other important companions. With an end date: drift away or rise as a star.',
  'Name oder ID': 'Name or ID',
  'Name oder Gramps-ID': 'Name or Gramps ID',
  'Beziehung': 'Relationship',
  'Freund': 'Friend',
  'Beginn': 'Start',
  'Ende': 'End',
  'Austritt': 'Exit',
  'Austritt nach dem Ende': 'Exit after the end',
  'Wegdriften': 'Drift away',
  'Stern': 'Star',
  'Person entfernen': 'Remove person',
  'Person hinzufügen': 'Add person',

  // Schlusstext und Speichern
  'Schlusstext': 'Closing text',
  'Vorschläge richten sich nach der gewählten Videosprache.': 'Suggestions follow the chosen video language.',
  'Titel': 'Title',
  'Zeile 1': 'Line 1',
  'Zeile 2': 'Line 2',
  'Änderungen gespeichert.': 'Changes saved.',
  'Einstellungen speichern': 'Save settings',
  'Einstellungen werden gespeichert …': 'Saving settings …',
  'Die Einstellungen konnten nicht gespeichert werden. Bitte die Meldung unter dem Formular beachten.': 'The settings could not be saved. Please see the message below the form.',

  // Video
  'Bereit, wenn du es bist': 'Ready when you are',
  'Deine Geschichte': 'Your story',
  'in Bewegung.': 'in motion.',
  'Die Lebenslinien entstehen aus den Daten deiner Hauptperson und den hinzugefügten Wegbegleitern.': 'The life lines are drawn from the data of your main person and the companions you added.',
  'Video erstellen': 'Create video',
  'Vorschaubild erstellen': 'Create preview image',
  'Vorschaubild': 'Preview image',
  'Mitte': 'Middle',
  'Schluss': 'Ending',
  'Vorschaubild wird erstellt …': 'Creating the preview image …',
  'Das Vorschaubild konnte nicht geladen werden.': 'The preview image could not be loaded.',
  'Vorschau: Schlussbild.': 'Preview: final screen.',
  'Vorschau: Mitte des Lebenslaufs.': 'Preview: middle of the life story.',
  'Fortschritt der Videoerstellung': 'Video creation progress',
  'Stammbaum wird aus Gramps geladen …': 'Loading the family tree from Gramps …',
  'Dein Video ist fertig.': 'Your video is ready.',
  'Das Video konnte nicht erstellt werden.': 'The video could not be created.',
  'Vorschaubild des Videos': 'Preview image of the video',
  'Vorschau des erstellten Videos': 'Preview of the created video',
  'Video herunterladen': 'Download video',
  'Zum Video': 'Go to video',
  'Dein Video wird gerade erstellt. Der Stammbaum wird aus Gramps geladen …': 'Your video is being created. Loading the family tree from Gramps …',
  'Gerade wird das Video eines anderen Kontos erstellt. Danach kannst du dein Video starten.': "Another account's video is being created right now. You can start yours afterwards.",
};

// Texte mit eingesetzten Werten
const UI_EN_PATTERNS = [
  [/^Anfrage fehlgeschlagen \((\d+)\)\.$/, 'Request failed ($1).'],
  [/^Server nicht erreichbar: (.*)$/, 'Server unreachable: $1'],
  [/^Gespeichert: (.*)$/, 'Stored: $1'],
  [/^Video wird gerendert … (\d+) %$/, 'Rendering the video … $1 %'],
  [/^Dein Video wird gerade erstellt … (\d+) %$/, 'Your video is being created … $1 %'],
  [/^Verbindung unterbrochen, versuche es erneut … \((.*)\)$/, 'Connection interrupted, trying again … ($1)'],
  [/^Verbindung steht\. 1 Person im Stammbaum\.$/, 'The connection works. 1 person in the family tree.'],
  [/^Verbindung steht\. (\d+) Personen im Stammbaum\.$/, 'The connection works. $1 people in the family tree.'],
  [/^Ausgewählt: (.*)$/, 'Selected: $1'],
  [/^(\d+) Treffer, die ersten (\d+) werden gezeigt\. Bitte genauer eingeben\.$/, '$1 matches, showing the first $2. Please be more specific.'],
];

const UI_ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];

// Gewählte Sprache: gespeicherte Auswahl, sonst die Sprache des Browsers
const uiLang = (() => {
  try {
    const stored = localStorage.getItem('lebenslinien_ui_lang');
    if (stored === 'de' || stored === 'en') return stored;
  } catch {}
  return String(navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
})();

function uiText(text) {
  const key = text.trim();
  if (!key) return text;
  let translated = UI_EN[key];
  if (!translated) {
    const match = UI_EN_PATTERNS.find(([pattern]) => pattern.test(key));
    if (match) translated = key.replace(match[0], match[1]);
  }
  return translated ? text.replace(key, () => translated) : text;
}

function translateNode(node) {
  // translate="no" kennzeichnet Daten (Benutzername, Personen aus Gramps), die nie übersetzt werden
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement?.closest('[translate="no"]')) return;
    const translated = uiText(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.closest('[translate="no"]')) return;
  for (const name of UI_ATTRIBUTES) {
    const value = node.getAttribute(name);
    if (value) {
      const translated = uiText(value);
      if (translated !== value) node.setAttribute(name, translated);
    }
  }
  for (const child of node.childNodes) translateNode(child);
}

document.documentElement.lang = uiLang;
for (const button of document.querySelectorAll('[data-ui-lang]')) {
  button.setAttribute('aria-pressed', String(button.dataset.uiLang === uiLang));
  button.addEventListener('click', () => {
    if (button.dataset.uiLang === uiLang) return;
    try { localStorage.setItem('lebenslinien_ui_lang', button.dataset.uiLang); } catch {}
    location.reload();   // neu laden, damit auch bereits eingesetzte Texte und Servermeldungen wechseln
  });
}

if (uiLang === 'en') {
  document.title = uiText(document.title);
  translateNode(document.body);
  // Texte, die app.js später einsetzt, ebenfalls übersetzen
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') translateNode(record.target);
      else if (record.type === 'characterData') translateNode(record.target);
      else for (const node of record.addedNodes) translateNode(node);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: UI_ATTRIBUTES });
}
