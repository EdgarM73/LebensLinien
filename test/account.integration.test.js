import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { MESSAGES_EN, translateMessage } from '../src/messages.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverFile = path.join(root, 'server.js');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer(context, dataDir) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: { ...process.env, APP_DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', APP_REGISTRATION_KEY: '', APP_VIDEO_RETENTION_DAYS: '' },
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
  return base;
}

const send = (base, method, route, data, cookie, headers = {}) => fetch(`${base}${route}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
  body: JSON.stringify(data),
});
const cookieOf = (response) => response.headers.get('set-cookie').split(';')[0];

test('Passwort ändern meldet andere Geräte ab und antwortet in der Sprache der Oberfläche', async (context) => {
  const base = await startServer(context, mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-account-')));
  const here = cookieOf(await send(base, 'POST', '/api/register', { username: 'konto-user', password: 'validpass' }));
  const other = cookieOf(await send(base, 'POST', '/api/login', { username: 'konto-user', password: 'validpass' }));

  const wrong = await send(base, 'POST', '/api/account/password', { currentPassword: 'falsch', newPassword: 'neuespass' }, here);
  assert.equal(wrong.status, 403);
  assert.equal((await wrong.json()).error, 'Das aktuelle Passwort stimmt nicht.');
  const wrongEnglish = await send(base, 'POST', '/api/account/password', { currentPassword: 'falsch', newPassword: 'neuespass' }, here, { 'X-UI-Lang': 'en' });
  assert.equal((await wrongEnglish.json()).error, 'The current password is wrong.');

  const short = await send(base, 'POST', '/api/account/password', { currentPassword: 'validpass', newPassword: 'kurz7zz' }, here);
  assert.equal(short.status, 400);
  assert.equal((await send(base, 'POST', '/api/account/password', { currentPassword: 'validpass', newPassword: 'neuespass' })).status, 401, 'ohne Anmeldung nicht möglich');

  assert.equal((await send(base, 'POST', '/api/account/password', { currentPassword: 'validpass', newPassword: 'neuespass' }, here)).status, 200);
  assert.equal((await fetch(`${base}/api/me`, { headers: { Cookie: here } })).status, 200, 'die aktuelle Sitzung bleibt angemeldet');
  assert.equal((await fetch(`${base}/api/me`, { headers: { Cookie: other } })).status, 401, 'andere Sitzungen werden beendet');
  assert.equal((await send(base, 'POST', '/api/login', { username: 'konto-user', password: 'validpass' })).status, 401);
  assert.equal((await send(base, 'POST', '/api/login', { username: 'konto-user', password: 'neuespass' })).status, 200);
});

test('Konto löschen entfernt Konto, Sitzungen und Dateien', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-account-'));
  const base = await startServer(context, dataDir);
  const cookie = cookieOf(await send(base, 'POST', '/api/register', { username: 'loesch-user', password: 'validpass' }));
  const keep = cookieOf(await send(base, 'POST', '/api/register', { username: 'bleibt-user', password: 'validpass' }));

  // Eine kleine WAV-Datei als Hintergrundmusik hochladen
  const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.alloc(32)]);
  const upload = await fetch(`${base}/api/audio`, { method: 'POST', headers: { Cookie: cookie, 'X-Audio-Name': 'musik.wav' }, body: wav });
  assert.equal(upload.status, 200);
  assert.equal(readdirSync(path.join(dataDir, 'audio')).length, 1);

  assert.equal((await send(base, 'DELETE', '/api/account', { password: 'falsch' }, cookie)).status, 403);
  assert.equal((await fetch(`${base}/api/me`, { headers: { Cookie: cookie } })).status, 200, 'ein falsches Passwort löscht nichts');

  const removed = await send(base, 'DELETE', '/api/account', { password: 'validpass' }, cookie);
  assert.equal(removed.status, 200);
  assert.match(removed.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await fetch(`${base}/api/me`, { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await send(base, 'POST', '/api/login', { username: 'loesch-user', password: 'validpass' })).status, 401);
  assert.equal(readdirSync(path.join(dataDir, 'audio')).length, 0, 'die Musik ist gelöscht');
  const users = JSON.parse(readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  assert.deepEqual(users.map((user) => user.username), ['bleibt-user'], 'andere Konten bleiben bestehen');
  assert.equal((await fetch(`${base}/api/me`, { headers: { Cookie: keep } })).status, 200);
});

test('verwaiste Dateien werden beim Start entfernt, frische bleiben', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-account-'));
  mkdirSync(path.join(dataDir, 'videos'), { recursive: true });
  const old = path.join(dataDir, 'videos', 'verwaist-alt.mp4');
  const fresh = path.join(dataDir, 'videos', 'entsteht-gerade.mp4');
  writeFileSync(old, 'x');
  writeFileSync(fresh, 'x');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  utimesSync(old, twoHoursAgo, twoHoursAgo);

  await startServer(context, dataDir);
  assert.equal(existsSync(old), false, 'alte Datei ohne Konto wird gelöscht');
  assert.equal(existsSync(fresh), true, 'ein gerade entstehendes Video bleibt');
});

test('jede englische Servermeldung gehört zu einem deutschen Text im Server', () => {
  const source = readFileSync(serverFile, 'utf8');
  for (const german of Object.keys(MESSAGES_EN)) assert.ok(source.includes(german), `Text nicht mehr im Server: ${german}`);
  assert.equal(translateMessage('Anmeldung fehlgeschlagen.', 'de'), 'Anmeldung fehlgeschlagen.');
  assert.equal(translateMessage('Der Gramps-Server „x.example.org“ ist auf diesem Server nicht freigegeben (Einstellung APP_ALLOWED_GRAMPS_HOSTS).', 'en'),
    'The Gramps server "x.example.org" is not allowed on this server (setting APP_ALLOWED_GRAMPS_HOSTS).');
  assert.equal(translateMessage('Mehrere Personen passen zur Hauptperson. Bitte die Gramps-ID eintragen: I0024 Thomas Huber', 'en'),
    'Several people match the main person. Please enter the Gramps ID: I0024 Thomas Huber');
  assert.equal(translateMessage('Unbekannter Text', 'en'), 'Unbekannter Text', 'ohne Eintrag bleibt der deutsche Text');
});
