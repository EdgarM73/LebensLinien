const authView = document.querySelector('#auth-view');
const workspace = document.querySelector('#workspace');
const authForm = document.querySelector('#auth-form');
const configForm = document.querySelector('#config-form');
const extrasList = document.querySelector('#extras-list');
const audioInput = document.querySelector('#audio-input');
let authMode = 'login';
let suggestedTexts = null;
let savedSnapshot = '';
let previousVideo = false;   // gab es vor dem aktuellen Auftrag schon ein Video?

async function request(path, options = {}) {
  // X-UI-Lang: der Server antwortet mit Meldungen in der Sprache der Oberfläche
  const response = await fetch(path, { ...options, headers: { 'X-UI-Lang': uiLang, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || `Anfrage fehlgeschlagen (${response.status}).`);
  return data;
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function setMode(mode) {
  authMode = mode;
  const login = mode === 'login';
  document.querySelector('#login-tab').classList.toggle('active', login);
  document.querySelector('#register-tab').classList.toggle('active', !login);
  document.querySelector('#login-tab').setAttribute('aria-selected', String(login));
  document.querySelector('#register-tab').setAttribute('aria-selected', String(!login));
  document.querySelector('#invite-field').hidden = login || !window.registrationKeyRequired;
  const password = authForm.elements.password;
  password.autocomplete = login ? 'current-password' : 'new-password';
  password.minLength = login ? 1 : 8;
  document.querySelector('#auth-submit').innerHTML = login ? 'Anmelden <span aria-hidden="true">↗</span>' : 'Konto erstellen <span aria-hidden="true">↗</span>';
  document.querySelector('#auth-note').textContent = login ? 'Passwort vergessen? Bitte den Admin um einen Reset-Link bitten.' : 'Passwort mindestens 8 Zeichen. Zugangsdaten werden verschlüsselt gespeichert.';
  showError(document.querySelector('#auth-error'), '');
}

function addExtra(value = {}) {
  const row = document.createElement('div');
  row.className = 'extra-row';
  const person = document.createElement('input');
  person.className = 'extra-person'; person.placeholder = 'Name oder Gramps-ID'; person.setAttribute('aria-label', 'Name oder Gramps-ID'); person.value = value.name || value.id || '';
  const rel = document.createElement('input');
  rel.className = 'extra-rel'; rel.placeholder = 'Freund'; rel.setAttribute('aria-label', 'Beziehung'); rel.value = value.rel || '';
  const start = document.createElement('input');
  start.className = 'extra-start'; start.placeholder = '1988'; start.setAttribute('aria-label', 'Beginn'); start.inputMode = 'numeric'; start.value = value.start || '';
  const end = document.createElement('input');
  end.className = 'extra-end'; end.placeholder = 'optional'; end.setAttribute('aria-label', 'Ende'); end.inputMode = 'numeric'; end.value = value.end || '';
  const exit = document.createElement('select');
  exit.className = 'extra-exit'; exit.setAttribute('aria-label', 'Austritt nach dem Ende');
  exit.add(new Option('Wegdriften', 'drift'));
  exit.add(new Option('Stern', 'star'));
  exit.value = value.exit === 'star' ? 'star' : 'drift';
  exit.disabled = !end.value;
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'remove-extra'; remove.setAttribute('aria-label', 'Person entfernen'); remove.title = 'Person entfernen'; remove.textContent = '×';
  for (const field of [person, rel, start, end, exit]) row.append(field);
  row.append(remove);
  end.addEventListener('input', () => { exit.disabled = !end.value.trim(); });
  remove.addEventListener('click', () => row.remove());
  extrasList.append(row);
}

function readConfig() {
  const data = new FormData(configForm);
  const extras = [...extrasList.querySelectorAll('.extra-row')].map((row) => {
    const raw = row.querySelector('.extra-person').value.trim();
    const end = row.querySelector('.extra-end').value.trim();
    const isId = /^I\d+$/i.test(raw);
    return {
      ...(raw ? (isId ? { id: raw } : { name: raw }) : {}),
      rel: row.querySelector('.extra-rel').value.trim(),
      start: row.querySelector('.extra-start').value.trim(),
      ...(end ? { end, exit: row.querySelector('.extra-exit').value } : {}),
    };
  }).filter((item) => item.name || item.id || item.start || item.end || item.rel);
  return {
    url: data.get('url'), username: data.get('username'), password: data.get('password'), person: data.get('person'), lang: data.get('lang'), anonymous: data.get('names') === 'hide', mainLabel: configForm.elements.mainLabel.value.trim(),
    grandchildren: data.get('grandchildren') !== 'hide', seconds: configForm.elements.seconds.value.trim(), extras,
    texts: {
      title: document.querySelector('#ending-title').value,
      lines: [document.querySelector('#ending-line-1').value, document.querySelector('#ending-line-2').value],
    },
  };
}

function setSuggestedTexts(texts) {
  suggestedTexts = texts;
  document.querySelector('#ending-title').value = texts.title;
  document.querySelector('#ending-line-1').value = texts.lines[0] || '';
  document.querySelector('#ending-line-2').value = texts.lines[1] || '';
}

function showConfig(config, defaults) {
  for (const name of ['url', 'username', 'person', 'lang']) if (config[name] != null) configForm.elements[name].value = config[name];
  configForm.elements.password.value = '';
  configForm.elements.names.value = config.anonymous ? 'hide' : 'show';
  configForm.elements.mainLabel.value = config.mainLabel || '';
  configForm.elements.grandchildren.value = config.grandchildren === false ? 'hide' : 'show';
  configForm.elements.seconds.value = config.seconds || '';
  updateMainLabel();
  setSuggestedTexts(defaults);
  if (config.texts) {
    document.querySelector('#ending-title').value = config.texts.title || '';
    document.querySelector('#ending-line-1').value = config.texts.lines?.[0] || '';
    document.querySelector('#ending-line-2').value = config.texts.lines?.[1] || '';
  }
  document.querySelector('#password-hint').textContent = config.hasPassword ? 'Passwort gespeichert. Leer lassen, um es beizubehalten.' : 'Wird verschlüsselt gespeichert.';
  extrasList.replaceChildren();
  (config.extras || []).forEach(addExtra);
  const ready = Boolean(config.configured);
  document.querySelector('.status-pill').classList.toggle('ready', ready);
  document.querySelector('#connection-status').textContent = ready ? 'Verbindung eingerichtet' : 'Noch nicht eingerichtet';
  savedSnapshot = JSON.stringify(readConfig());   // Stand der gespeicherten Einstellungen, um Änderungen zu erkennen
}

// Speichert das Formular. Gibt true zurück, wenn die Einstellungen auf dem Server liegen.
async function saveConfig() {
  showError(document.querySelector('#config-error'), '');
  document.querySelector('#save-message').hidden = true;
  const button = document.querySelector('#save-button');
  button.disabled = true;
  try {
    const config = await request('/api/config', { method: 'POST', body: JSON.stringify(readConfig()) });
    const defaults = await request(`/api/texts?lang=${encodeURIComponent(config.lang || 'de')}`);
    showConfig(config, defaults);
    document.querySelector('#save-message').hidden = false;
    return true;
  } catch (error) {
    showError(document.querySelector('#config-error'), error.message);
    return false;
  } finally { button.disabled = false; }
}

function showVideo(available) {
  const video = document.querySelector('#video-preview');
  document.querySelector('#download-link').hidden = !available;
  video.hidden = !available;
  if (available) video.src = `/api/video?v=${Date.now()}`;   // neuer Parameter, damit nicht das alte Video im Player bleibt
  else video.removeAttribute('src');
}

// Zeigt den Stand eines Auftrags. Gibt true zurück, solange er noch läuft.
function showJob(job) {
  const button = document.querySelector('#generate-button');
  const bar = document.querySelector('#render-progress');
  const message = document.querySelector('#render-message');
  const running = job.state === 'running';
  button.disabled = running;
  bar.hidden = !running;
  message.classList.toggle('render-error', job.state === 'error');
  if (running) {
    if (job.phase === 'render') { bar.value = job.progress || 0; message.textContent = `Video wird gerendert … ${job.progress || 0} %`; }
    else { bar.removeAttribute('value'); message.textContent = 'Stammbaum wird aus Gramps geladen …'; }
  } else if (job.state === 'done') {
    message.textContent = 'Dein Video ist fertig.';
    showVideo(true);
  } else if (job.state === 'error') {
    message.textContent = job.error || 'Das Video konnte nicht erstellt werden.';
    if (previousVideo) showVideo(true);   // das zuletzt erstellte Video gibt es weiterhin
  }
  return running;
}

let pollTimer = null;
function pollJob() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    try {
      if (showJob(await request('/api/generate'))) pollJob();
    } catch (error) {
      // Kurze Aussetzer (Proxy, Neustart) nicht als Fehler werten, weiter nachfragen
      document.querySelector('#render-message').textContent = `Verbindung unterbrochen, versuche es erneut … (${error.message})`;
      pollJob();
    }
  }, 1500);
}

function showAudio(name) {
  audioInput.value = '';
  document.querySelector('#audio-status').textContent = name
    ? `Gespeichert: ${name}`
    : 'Optional · MP3, WAV, M4A, AAC, OGG oder FLAC · maximal 50 MB';
  document.querySelector('#audio-remove').hidden = !name;
}

async function enter(user) {
  authView.hidden = true;
  workspace.hidden = false;
  document.querySelector('#account-area').hidden = false;
  document.querySelector('#user-label').textContent = user.username;
  const state = await request('/api/me');
  window.registrationKeyRequired = state.registrationKeyRequired;
  const defaults = await request(`/api/texts?lang=${encodeURIComponent(state.config.lang || 'de')}`);
  showConfig(state.config, defaults);
  showAudio(state.audioName);
  showVideo(state.hasVideo);
  // Läuft noch ein Auftrag (z. B. nach dem Neuladen der Seite), den Fortschritt weiter anzeigen
  if (state.job?.state === 'running' && showJob(state.job)) pollJob();
  else if (state.job?.state === 'error') showJob(state.job);
}

async function initialize() {
  const status = await request('/api/status');
  window.registrationKeyRequired = status.registrationKeyRequired;
  const resetToken = new URLSearchParams(location.hash.slice(1)).get('reset');
  if (resetToken) {
    authView.hidden = false;
    workspace.hidden = true;
    document.querySelector('.mode-tabs').hidden = true;
    authForm.hidden = true;
    document.querySelector('#auth-note').hidden = true;
    const resetForm = document.querySelector('#reset-form');
    resetForm.dataset.token = resetToken;
    resetForm.hidden = false;
    return;
  }
  try {
    const me = await request('/api/me');
    await enter(me);
  } catch {
    workspace.hidden = true;
    authView.hidden = false;
  }
}

document.querySelector('#login-tab').addEventListener('click', () => setMode('login'));
document.querySelector('#register-tab').addEventListener('click', () => setMode('register'));
document.querySelector('#add-extra').addEventListener('click', () => addExtra());

function updateMainLabel() { document.querySelector('#main-label-field').hidden = configForm.elements.names.value !== 'hide'; }
configForm.elements.names.addEventListener('change', updateMainLabel);
updateMainLabel();

configForm.elements.lang.addEventListener('change', async () => {
  if (!suggestedTexts) return;
  const followsSuggestion = {
    title: document.querySelector('#ending-title').value === suggestedTexts.title,
    line1: document.querySelector('#ending-line-1').value === (suggestedTexts.lines[0] || ''),
    line2: document.querySelector('#ending-line-2').value === (suggestedTexts.lines[1] || ''),
  };
  if (!Object.values(followsSuggestion).some(Boolean)) return;
  const lang = configForm.elements.lang.value;
  try {
    const texts = await request(`/api/texts?lang=${encodeURIComponent(lang)}`);
    if (configForm.elements.lang.value !== lang) return;
    suggestedTexts = texts;
    if (followsSuggestion.title) document.querySelector('#ending-title').value = texts.title;
    if (followsSuggestion.line1) document.querySelector('#ending-line-1').value = texts.lines[0] || '';
    if (followsSuggestion.line2) document.querySelector('#ending-line-2').value = texts.lines[1] || '';
  } catch (error) { showError(document.querySelector('#config-error'), error.message); }
});

// Zugangsdaten aus dem Formular; ein leeres Passwort heißt: das gespeicherte verwenden
function grampsFields() {
  return { url: configForm.elements.url.value.trim(), username: configForm.elements.username.value.trim(), password: configForm.elements.password.value };
}

document.querySelector('#test-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const status = document.querySelector('#test-status');
  button.disabled = true;
  status.className = 'test-status';
  status.textContent = 'Verbindung wird geprüft …';
  try {
    const result = await request('/api/gramps/test', { method: 'POST', body: JSON.stringify(grampsFields()) });
    status.classList.add('test-ok');
    status.textContent = `Verbindung steht. ${result.people} ${result.people === 1 ? 'Person' : 'Personen'} im Stammbaum.`;
  } catch (error) {
    status.classList.add('test-error');
    status.textContent = error.message;
  } finally { button.disabled = false; }
});

// Personensuche für die Hauptperson
const personInput = document.querySelector('#person-input');
const personResults = document.querySelector('#person-results');
const personHint = document.querySelector('#person-hint');
const personHintDefault = personHint.textContent;
let searchTimer = null;
let searchRun = 0;
let activeResult = -1;

function closeResults() {
  personResults.hidden = true;
  personResults.replaceChildren();
  personInput.setAttribute('aria-expanded', 'false');
  personInput.removeAttribute('aria-activedescendant');
  activeResult = -1;
}

function lifeDates(person) {
  return [person.birth ? `* ${person.birth}` : '', person.death ? `† ${person.death}` : ''].filter(Boolean).join('  ');
}

function choosePerson(person) {
  personInput.value = person.id;
  personHint.textContent = `Ausgewählt: ${person.name || person.id}${lifeDates(person) ? ` (${lifeDates(person)})` : ''}`;
  closeResults();
}

function setActiveResult(index) {
  const items = [...personResults.querySelectorAll('[role="option"]')];
  if (!items.length) return;
  activeResult = (index + items.length) % items.length;
  items.forEach((item, i) => item.setAttribute('aria-selected', String(i === activeResult)));
  personInput.setAttribute('aria-activedescendant', items[activeResult].id);
  items[activeResult].scrollIntoView({ block: 'nearest' });
}

function showResults(result, note) {
  personResults.replaceChildren();
  activeResult = -1;
  for (const [index, person] of (result?.people || []).entries()) {
    const item = document.createElement('li');
    item.id = `person-result-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.setAttribute('translate', 'no');   // Namen aus Gramps sind Daten, keine Oberflächentexte
    const name = document.createElement('span');
    name.className = 'result-name';
    name.textContent = person.name || (uiLang === 'en' ? '(no name)' : '(ohne Namen)');
    const dates = document.createElement('span');
    dates.className = 'result-dates';
    dates.textContent = lifeDates(person);
    const id = document.createElement('span');
    id.className = 'result-id';
    id.textContent = person.id;
    item.append(name, dates, id);
    // mousedown statt click: der Klick soll wirken, bevor das Eingabefeld den Fokus verliert
    item.addEventListener('mousedown', (event) => { event.preventDefault(); choosePerson(person); });
    personResults.append(item);
  }
  const message = note || (result && !result.people.length ? 'Keine passende Person gefunden.' : result && result.total > result.people.length ? `${result.total} Treffer, die ersten ${result.people.length} werden gezeigt. Bitte genauer eingeben.` : '');
  if (message) {
    const info = document.createElement('li');
    info.className = 'result-note';
    info.textContent = message;
    personResults.append(info);
  }
  personResults.hidden = false;
  personInput.setAttribute('aria-expanded', 'true');
}

personInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  personHint.textContent = personHintDefault;
  const q = personInput.value.trim();
  if (q.length < 2) { closeResults(); return; }
  searchTimer = setTimeout(async () => {
    const run = ++searchRun;
    const access = grampsFields();
    if (!access.url || !access.username) { showResults(null, 'Für die Suche zuerst Server-URL, Benutzername und Passwort eintragen.'); return; }
    if (personResults.hidden) showResults(null, 'Suche in Gramps …');
    try {
      const result = await request('/api/gramps/people', { method: 'POST', body: JSON.stringify({ ...access, q }) });
      if (run === searchRun) showResults(result);
    } catch (error) {
      if (run === searchRun) showResults(null, error.message);
    }
  }, 300);
});

personInput.addEventListener('keydown', (event) => {
  if (personResults.hidden) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); setActiveResult(activeResult + 1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveResult(activeResult - 1); }
  else if (event.key === 'Enter' && activeResult >= 0) { event.preventDefault(); personResults.querySelectorAll('[role="option"]')[activeResult].dispatchEvent(new MouseEvent('mousedown', { cancelable: true })); }
  else if (event.key === 'Escape') closeResults();
});
personInput.addEventListener('blur', () => { searchRun++; clearTimeout(searchTimer); closeResults(); });

audioInput.addEventListener('change', async () => {
  const file = audioInput.files[0];
  if (!file) return;
  const status = document.querySelector('#audio-status');
  const remove = document.querySelector('#audio-remove');
  audioInput.disabled = true;
  remove.disabled = true;
  status.textContent = 'Musik wird hochgeladen …';
  try {
    const response = await fetch('/api/audio', { method: 'POST', headers: { 'X-UI-Lang': uiLang, 'X-Audio-Name': encodeURIComponent(file.name) }, body: file });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload fehlgeschlagen.');
    showAudio(result.audioName);
  } catch (error) {
    status.textContent = error.message;
    audioInput.value = '';
  } finally {
    audioInput.disabled = false;
    remove.disabled = false;
  }
});

document.querySelector('#audio-remove').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try { await request('/api/audio', { method: 'DELETE' }); showAudio(null); }
  catch (error) { document.querySelector('#audio-status').textContent = error.message; }
  finally { button.disabled = false; }
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.querySelector('#auth-submit');
  submit.disabled = true;
  showError(document.querySelector('#auth-error'), '');
  const values = Object.fromEntries(new FormData(authForm));
  try {
    const user = await request(`/api/${authMode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(values) });
    await enter(user);
  } catch (error) { showError(document.querySelector('#auth-error'), error.message); }
  finally { submit.disabled = false; }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await request('/api/logout', { method: 'POST', body: '{}' });
  location.reload();
});

// Konto-Dialog: Passwort ändern und Konto löschen
const accountDialog = document.querySelector('#account-dialog');
const passwordForm = document.querySelector('#password-form');
const deleteForm = document.querySelector('#delete-form');

document.querySelector('#account-button').addEventListener('click', () => {
  passwordForm.reset();
  deleteForm.reset();
  showError(document.querySelector('#password-error'), '');
  showError(document.querySelector('#delete-error'), '');
  document.querySelector('#password-success').hidden = true;
  accountDialog.showModal();
});
document.querySelector('#account-close').addEventListener('click', () => accountDialog.close());
// Klick auf den abgedunkelten Hintergrund schließt den Dialog
accountDialog.addEventListener('click', (event) => { if (event.target === accountDialog) accountDialog.close(); });

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = document.querySelector('#password-error');
  const success = document.querySelector('#password-success');
  const button = document.querySelector('#password-submit');
  success.hidden = true;
  showError(error, '');
  if (passwordForm.elements.newPassword.value !== passwordForm.elements.confirmPassword.value) {
    showError(error, 'Die Passwörter stimmen nicht überein.');
    return;
  }
  button.disabled = true;
  try {
    await request('/api/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: passwordForm.elements.currentPassword.value, newPassword: passwordForm.elements.newPassword.value }) });
    passwordForm.reset();
    success.hidden = false;
  } catch (failure) { showError(error, failure.message); }
  finally { button.disabled = false; }
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = document.querySelector('#delete-error');
  const button = document.querySelector('#delete-submit');
  showError(error, '');
  button.disabled = true;
  try {
    await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: deleteForm.elements.password.value }) });
    location.reload();
  } catch (failure) {
    showError(error, failure.message);
    button.disabled = false;
  }
});

configForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveConfig();
});

// Video und Vorschaubild entstehen aus den gespeicherten Einstellungen: geänderte Eingaben deshalb zuerst speichern
async function ensureSaved() {
  const message = document.querySelector('#render-message');
  message.classList.remove('render-error');
  if (JSON.stringify(readConfig()) === savedSnapshot && !document.querySelector('.status-pill:not(.ready)')) return true;
  message.textContent = 'Einstellungen werden gespeichert …';
  if (await saveConfig()) { message.textContent = ''; return true; }
  message.classList.add('render-error');
  message.textContent = 'Die Einstellungen konnten nicht gespeichert werden. Bitte die Meldung unter dem Formular beachten.';
  return false;
}

// Vorschaubild: ein einzelnes Bild aus der Mitte oder vom Schluss, in wenigen Sekunden fertig
for (const button of document.querySelectorAll('.preview-button')) {
  button.addEventListener('click', async () => {
    const buttons = [...document.querySelectorAll('.preview-button')];
    const message = document.querySelector('#render-message');
    const image = document.querySelector('#preview-image');
    buttons.forEach((item) => { item.disabled = true; });
    try {
      if (!await ensureSaved()) return;
      message.textContent = 'Vorschaubild wird erstellt …';
      await request('/api/preview', { method: 'POST', body: JSON.stringify({ position: button.dataset.position }) });
      // Erst melden, wenn das neue Bild wirklich geladen ist (sonst steht kurz noch das alte da)
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Das Vorschaubild konnte nicht geladen werden.'));
        image.src = `/api/preview?v=${Date.now()}`;
      });
      image.hidden = false;
      message.textContent = button.dataset.position === 'end' ? 'Vorschau: Schlussbild.' : 'Vorschau: Mitte des Lebenslaufs.';
    } catch (error) {
      message.classList.add('render-error');
      message.textContent = error.message;
    } finally { buttons.forEach((item) => { item.disabled = false; }); }
  });
}

document.querySelector('#generate-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const message = document.querySelector('#render-message');
  button.disabled = true;
  if (!await ensureSaved()) { button.disabled = false; return; }
  try {
    previousVideo = !document.querySelector('#video-preview').hidden;
    showVideo(false);
    document.querySelector('#preview-image').hidden = true;
    if (showJob(await request('/api/generate', { method: 'POST', body: '{}' }))) pollJob();
  } catch (error) {
    message.classList.add('render-error');
    message.textContent = error.message;
    button.disabled = false;
  }
});

setMode('login');
initialize().catch((error) => {
  authView.hidden = false;
  showError(document.querySelector('#auth-error'), `Server nicht erreichbar: ${error.message}`);
});

document.querySelector('#reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.password.value;
  if (password !== form.elements.confirmPassword.value) {
    showError(document.querySelector('#reset-error'), 'Die Passwörter stimmen nicht überein.');
    return;
  }
  const button = document.querySelector('#reset-submit');
  button.disabled = true;
  showError(document.querySelector('#reset-error'), '');
  try {
    await request('/api/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ token: form.dataset.token, password }),
    });
    form.hidden = true;
    document.querySelector('#reset-success').hidden = false;
    document.querySelector('.mode-tabs').hidden = false;
    authForm.hidden = false;
    document.querySelector('#auth-note').hidden = false;
    setMode('login');
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  } catch (error) {
    showError(document.querySelector('#reset-error'), error.message);
  } finally { button.disabled = false; }
});