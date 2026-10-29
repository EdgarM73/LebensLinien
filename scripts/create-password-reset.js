#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { issuePasswordReset } from '../src/password-reset.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.resolve(process.env.APP_DATA_DIR || path.join(root, 'data'));
const usersFile = path.join(dataDir, 'users.json');
const [username, baseUrl = 'http://127.0.0.1:3000'] = process.argv.slice(2);

if (!username) {
  console.error('Aufruf: node scripts/create-password-reset.js BENUTZERNAME [APP-URL]');
  process.exit(1);
}
if (!existsSync(usersFile)) {
  console.error('Keine Nutzerdaten gefunden.');
  process.exit(1);
}

let base;
try {
  const parsed = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  base = parsed.origin;
} catch {
  console.error('Bitte eine gültige HTTP- oder HTTPS-App-URL angeben.');
  process.exit(1);
}

const users = JSON.parse(readFileSync(usersFile, 'utf8'));
const user = users.find((entry) => entry.username.toLowerCase() === username.trim().toLowerCase());
if (!user) {
  console.error('Nutzer nicht gefunden.');
  process.exit(1);
}

const { token, expiresAt } = issuePasswordReset(user, path.join(dataDir, 'password-resets'));
console.log(`Reset-Link (gültig bis ${new Date(expiresAt).toLocaleString()}): ${base}/#reset=${token}`);