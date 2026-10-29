import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { issuePasswordReset } from '../src/password-reset.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverFile = path.join(root, 'server.js');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && child.exitCode == null) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Testserver wurde nicht rechtzeitig gestartet.');
}

test('eight-character registration, one-time password reset, and session invalidation work over HTTP', async (context) => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-auth-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: { ...process.env, APP_DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', APP_REGISTRATION_KEY: 'test-invite' },
    stdio: 'ignore',
  });
  context.after(async () => {
    if (child.exitCode == null) child.kill();
    await new Promise((resolve) => child.exitCode != null ? resolve() : child.once('exit', resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });
  await waitForServer(`${base}/api/status`, child);

  const rejected = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-user', password: 'short7', invite: 'test-invite' }),
  });
  assert.equal(rejected.status, 400);

  const registration = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-user', password: 'validpass', invite: 'test-invite' }),
  });
  assert.equal(registration.status, 200);
  const cookie = registration.headers.get('set-cookie').split(';')[0];
  const users = JSON.parse(readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
  const { token } = issuePasswordReset(users[0], path.join(dataDir, 'password-resets'));

  const reset = await fetch(`${base}/api/password-reset/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'newpass8' }),
  });
  assert.equal(reset.status, 200);

  const oldSession = await fetch(`${base}/api/me`, { headers: { Cookie: cookie } });
  assert.equal(oldSession.status, 401);
  const reusedToken = await fetch(`${base}/api/password-reset/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'another8' }),
  });
  assert.equal(reusedToken.status, 400);

  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-user', password: 'newpass8' }),
  });
  assert.equal(login.status, 200);
});
