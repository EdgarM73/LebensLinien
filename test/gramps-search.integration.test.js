import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverFile = path.join(root, 'server.js');
const configPath = path.join(root, 'config_test.json');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const username = process.env.GRAMPS_TEST_USERNAME || config.username;
const password = process.env.GRAMPS_TEST_PASSWORD || config.password;
const url = process.env.GRAMPS_TEST_URL || config.url || 'https://grampsweb.apps.mw29.de';

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

// Startet einen Testserver, legt ein Konto an und liefert eine Funktion für angemeldete POST-Anfragen
async function startSession(context, env = {}) {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-search-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: { ...process.env, APP_DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', APP_REGISTRATION_KEY: '', APP_ALLOWED_GRAMPS_HOSTS: '', ...env },
    stdio: 'ignore',
  });
  context.after(async () => {
    if (child.exitCode == null) child.kill();
    await new Promise((resolve) => child.exitCode != null ? resolve() : child.once('exit', resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });
  const deadline = Date.now() + 5000;
  let up = false;
  while (!up && Date.now() < deadline && child.exitCode == null) {
    try { up = (await fetch(`${base}/api/status`)).ok; } catch {}
    if (!up) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(up, 'Testserver wurde nicht rechtzeitig gestartet.');
  const send = (route, data, cookie) => fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
  const registration = await send('/api/register', { username: 'search-user', password: 'validpass' });
  assert.equal(registration.status, 200);
  const cookie = registration.headers.get('set-cookie').split(';')[0];
  return (route, data) => send(route, data, cookie);
}

test('Verbindungstest und Personensuche lehnen ungültige Eingaben ohne Netzwerkzugriff ab', async (context) => {
  const post = await startSession(context, { APP_ALLOWED_GRAMPS_HOSTS: 'gramps.example.org' });

  const foreign = await post('/api/gramps/test', { url: 'https://anderer-host.example.net', username: 'a', password: 'b' });
  assert.equal(foreign.status, 400);
  assert.match((await foreign.json()).error, /anderer-host\.example\.net.*nicht freigegeben/, 'die Meldung nennt den abgelehnten Host');

  const insecure = await post('/api/gramps/test', { url: 'http://gramps.example.org', username: 'a', password: 'b' });
  assert.equal(insecure.status, 400);
  assert.match((await insecure.json()).error, /HTTPS/);

  const noPassword = await post('/api/gramps/people', { url: 'https://gramps.example.org', username: 'a', password: '', q: 'huber' });
  assert.equal(noPassword.status, 400);
  assert.match((await noPassword.json()).error, /Benutzername und Passwort/);

  const empty = await post('/api/gramps/people', { url: 'https://gramps.example.org', username: 'a', password: 'b', q: '  ' });
  assert.deepEqual(await empty.json(), { total: 0, people: [] }, 'eine leere Suche fragt Gramps nicht ab');

  const anonymous = await fetch(new URL('/api/gramps/test', (await post('/api/logout', {})).url), { method: 'POST', body: '{}' });
  assert.equal(anonymous.status, 401, 'ohne Anmeldung gibt es keinen Zugriff');
});

test('Verbindungstest und Personensuche gegen die GrampsWeb-Testinstanz', { skip: !username || !password }, async (context) => {
  const post = await startSession(context);

  const wrong = await post('/api/gramps/test', { url, username, password: 'sicher-falsches-passwort' });
  assert.equal(wrong.status, 400);
  assert.match((await wrong.json()).error, /Anmeldung bei Gramps ist fehlgeschlagen/);

  const ok = await post('/api/gramps/test', { url, username, password });
  assert.equal(ok.status, 200);
  const tested = await ok.json();
  assert.ok(tested.people > 10, 'der Teststammbaum enthält Personen');

  const search = await post('/api/gramps/people', { url, username, password, q: 'thomas hub' });
  assert.equal(search.status, 200);
  const found = await search.json();
  assert.ok(found.total >= 2, 'es gibt mehrere Thomas Huber');
  for (const person of found.people) {
    assert.equal(person.name, 'Thomas Huber');
    assert.match(person.id, /^I\d+$/);
  }
  assert.ok(found.people.some((person) => person.birth > 1800), 'Geburtsjahre werden mitgeliefert');

  const byId = await (await post('/api/gramps/people', { url, username, password, q: found.people[0].id })).json();
  assert.equal(byId.people[0].id, found.people[0].id, 'die Gramps-ID steht bei exaktem Treffer vorn');

  // Nach dem Speichern genügt ein leeres Passwort, aber nur für denselben Server und Benutzer
  assert.equal((await post('/api/config', { url, username, password, person: found.people[0].id, lang: 'de', extras: [] })).status, 200);
  assert.equal((await post('/api/gramps/people', { url, username, password: '', q: 'huber' })).status, 200);
  const otherServer = await post('/api/gramps/people', { url: 'https://example.org', username, password: '', q: 'huber' });
  assert.equal(otherServer.status, 400);
  assert.match((await otherServer.json()).error, /Benutzername und Passwort/, 'das gespeicherte Passwort geht nicht an einen anderen Server');
});

test('Optionen Dauer und Enkel werden geprüft und gespeichert', async (context) => {
  const post = await startSession(context);
  const base = { url: 'https://gramps.example.org', username: 'a', password: 'b', person: 'I0001', lang: 'de', extras: [] };

  for (const seconds of ['19', '181', '45.5', 'abc']) {
    const response = await post('/api/config', { ...base, seconds });
    assert.equal(response.status, 400, `Dauer ${seconds} muss abgelehnt werden`);
    assert.match((await response.json()).error, /zwischen 20 und 180/);
  }
  const saved = await (await post('/api/config', { ...base, seconds: '45', grandchildren: false, noMusic: true })).json();
  assert.equal(saved.noMusic, true, 'Ohne Musik wird gespeichert');
  assert.equal(saved.seconds, 45);
  assert.equal(saved.grandchildren, false);

  const defaults = await (await post('/api/config', { ...base, seconds: '', grandchildren: true })).json();
  assert.equal(defaults.seconds, undefined, 'leer bedeutet automatisch');
  assert.equal(defaults.grandchildren, undefined, 'Enkel sind standardmäßig dabei');
  assert.equal(defaults.noMusic, undefined, 'standardmäßig läuft Musik');
});

test('Vorschaubild gegen die GrampsWeb-Testinstanz', { skip: !username || !password }, async (context) => {
  const post = await startSession(context);
  const none = await post('/api/preview', { position: 'end' });
  assert.equal(none.status, 400, 'ohne gespeicherte Verbindung gibt es kein Vorschaubild');

  assert.equal((await post('/api/config', { url, username, password, person: 'Gibtesnicht Xyz', lang: 'de', extras: [] })).status, 200);
  const missing = await post('/api/preview', { position: 'end' });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /nicht gefunden/);

  assert.equal((await post('/api/config', { url, username, password: '', person: 'I0024', lang: 'de', extras: [], seconds: '30' })).status, 200);
  for (const position of ['middle', 'end']) {
    const made = await post('/api/preview', { position });
    assert.equal(made.status, 200);
    assert.equal((await made.json()).position, position);
  }
});
