const authView = document.querySelector('#auth-view');
const workspace = document.querySelector('#workspace');
const authForm = document.querySelector('#auth-form');
const configForm = document.querySelector('#config-form');
const extrasList = document.querySelector('#extras-list');
const audioInput = document.querySelector('#audio-input');
let authMode = 'login';
let suggestedTexts = null;

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
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
    url: data.get('url'), username: data.get('username'), password: data.get('password'), person: data.get('person'), lang: data.get('lang'), anonymous: data.get('names') === 'hide', mainLabel: configForm.elements.mainLabel.value.trim(), extras,
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
  document.querySelector('#generate-button').disabled = !ready;
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
  document.querySelector('#download-link').hidden = !state.hasVideo;
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

function updateMainLabel() { configForm.elements.mainLabel.disabled = configForm.elements.names.value !== 'hide'; }
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

audioInput.addEventListener('change', async () => {
  const file = audioInput.files[0];
  if (!file) return;
  const status = document.querySelector('#audio-status');
  const remove = document.querySelector('#audio-remove');
  audioInput.disabled = true;
  remove.disabled = true;
  status.textContent = 'Musik wird hochgeladen …';
  try {
    const response = await fetch('/api/audio', { method: 'POST', headers: { 'X-Audio-Name': encodeURIComponent(file.name) }, body: file });
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

configForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError(document.querySelector('#config-error'), '');
  document.querySelector('#save-message').hidden = true;
  const button = document.querySelector('#save-button');
  button.disabled = true;
  try {
    const config = await request('/api/config', { method: 'POST', body: JSON.stringify(readConfig()) });
    const defaults = await request(`/api/texts?lang=${encodeURIComponent(config.lang || 'de')}`);
    showConfig(config, defaults);
    document.querySelector('#save-message').hidden = false;
  } catch (error) { showError(document.querySelector('#config-error'), error.message); }
  finally { button.disabled = false; }
});

document.querySelector('#generate-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const message = document.querySelector('#render-message');
  const link = document.querySelector('#download-link');
  button.disabled = true;
  link.hidden = true;
  message.textContent = 'Lebenslinien werden berechnet und gerendert. Das kann einige Minuten dauern.';
  try {
    await request('/api/generate', { method: 'POST', body: '{}' });
    message.textContent = 'Dein Video ist fertig.';
    link.hidden = false;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
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