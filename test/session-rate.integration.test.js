import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverFile = path.join(root, 'server.js');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer(dataDir, env = {}) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: { ...process.env, APP_DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', APP_REGISTRATION_KEY: '', APP_TRUSTED_PROXIES: '', ...env },
    stdio: 'ignore',
  });
  const stop = async () => {
    if (child.exitCode == null) child.kill();
    await new Promise((resolve) => child.exitCode != null ? resolve() : child.once('exit', resolve));
  };
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && child.exitCode == null) {
    try { if ((await fetch(`${base}/api/status`)).ok) return { base, stop }; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await stop();
  throw new Error('Testserver wurde nicht rechtzeitig gestartet.');
}

const post = (base, route, data, headers = {}) => fetch(`${base}${route}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(data),
});

test('Sitzungen überstehen einen Neustart, abgebrochene Videoaufträge werden gemeldet', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-session-'));
  let server = await startServer(dataDir);
  context.after(async () => { await server.stop(); rmSync(dataDir, { recursive: true, force: true }); });

  const registration = await post(server.base, '/api/register', { username: 'session-user', password: 'validpass' });
  assert.equal(registration.status, 200);
  const cookie = registration.headers.get('set-cookie').split(';')[0];
  const token = decodeURIComponent(cookie.split('=')[1]);
  assert.ok(!readFileSync(path.join(dataDir, 'sessions.json'), 'utf8').includes(token), 'das Token darf nicht im Klartext gespeichert sein');

  await server.stop();
  // Ein Neustart mitten in der Videoerstellung hinterlässt die Markierung pendingJob
  const usersFile = path.join(dataDir, 'users.json');
  const users = JSON.parse(readFileSync(usersFile, 'utf8'));
  users[0].pendingJob = true;
  writeFileSync(usersFile, JSON.stringify(users));

  server = await startServer(dataDir);
  const me = await fetch(`${server.base}/api/me`, { headers: { Cookie: cookie } });
  assert.equal(me.status, 200, 'die Sitzung muss nach dem Neustart weiter gelten');
  const state = await me.json();
  assert.equal(state.username, 'session-user');
  assert.equal(state.job.state, 'error');
  assert.match(state.job.error, /neu gestartet/);
  assert.ok(!JSON.parse(readFileSync(usersFile, 'utf8'))[0].pendingJob, 'die Markierung muss wieder entfernt sein');

  assert.equal((await post(server.base, '/api/logout', {}, { Cookie: cookie })).status, 200);
  await server.stop();
  server = await startServer(dataDir);
  assert.equal((await fetch(`${server.base}/api/me`, { headers: { Cookie: cookie } })).status, 401, 'abgemeldet bleibt abgemeldet');
});

test('Anmeldebegrenzung zählt Fehlversuche je Adresse hinter dem Proxy', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-rate-'));
  const server = await startServer(dataDir, { APP_TRUSTED_PROXIES: '1' });
  context.after(async () => { await server.stop(); rmSync(dataDir, { recursive: true, force: true }); });
  assert.equal((await post(server.base, '/api/register', { username: 'rate-user', password: 'validpass' })).status, 200);

  // Der Client kann eigene Einträge voranstellen; es zählt der Eintrag, den der Proxy angehängt hat (der letzte)
  const from = (ip) => ({ 'X-Forwarded-For': `9.9.9.9, ${ip}` });
  const login = (ip, password) => post(server.base, '/api/login', { username: 'rate-user', password }, from(ip));

  for (let i = 0; i < 19; i++) assert.equal((await login('1.1.1.1', 'falsch')).status, 401);
  assert.equal((await login('1.1.1.1', 'validpass')).status, 200, 'eine erfolgreiche Anmeldung setzt den Zähler zurück');
  for (let i = 0; i < 20; i++) assert.equal((await login('1.1.1.1', 'falsch')).status, 401);
  assert.equal((await login('1.1.1.1', 'validpass')).status, 429, 'nach 20 Fehlversuchen ist die Adresse gesperrt');
  assert.equal((await login('2.2.2.2', 'validpass')).status, 200, 'andere Adressen sind nicht betroffen');
});

test('ohne vertrauenswürdigen Proxy wird X-Forwarded-For ignoriert', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-rate-'));
  const server = await startServer(dataDir);
  context.after(async () => { await server.stop(); rmSync(dataDir, { recursive: true, force: true }); });

  for (let i = 0; i < 20; i++) {
    const response = await post(server.base, '/api/login', { username: 'niemand', password: 'falsch' }, { 'X-Forwarded-For': `10.0.0.${i}` });
    assert.equal(response.status, 401);
  }
  const blocked = await post(server.base, '/api/login', { username: 'niemand', password: 'falsch' }, { 'X-Forwarded-For': '10.0.0.99' });
  assert.equal(blocked.status, 429, 'ein gefälschter Header darf die Sperre nicht umgehen');
});
