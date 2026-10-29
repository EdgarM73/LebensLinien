import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function issuePasswordReset(user, resetDir, now = Date.now()) {
  if (!user?.id) throw new Error('Nutzer nicht gefunden.');
  mkdirSync(resetDir, { recursive: true });
  const token = randomBytes(32).toString('base64url');
  const expiresAt = now + PASSWORD_RESET_TTL_MS;
  const file = path.join(resetDir, `${tokenHash(token)}.json`);
  writeFileSync(file, JSON.stringify({ userId: user.id, expiresAt }), { mode: 0o600, flag: 'wx' });
  return { token, expiresAt };
}

export function consumePasswordReset(token, users, resetDir, now = Date.now()) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const file = path.join(resetDir, `${tokenHash(token)}.json`);
  let reset;
  try { reset = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  try { unlinkSync(file); } catch { return null; }
  if (!Number.isFinite(reset.expiresAt) || reset.expiresAt <= now) return null;
  return users.find((user) => user.id === reset.userId) || null;
}