import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { consumePasswordReset, issuePasswordReset, PASSWORD_RESET_TTL_MS } from '../src/password-reset.js';

test('password reset token is hashed at rest and can only be consumed once', (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-reset-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const user = { id: 'user-1' };
  const { token } = issuePasswordReset(user, directory, 1000);
  const stored = readFileSync(path.join(directory, readdirSync(directory)[0]), 'utf8');

  assert.equal(stored.includes(token), false);
  assert.equal(consumePasswordReset(token, [user], directory, 1001), user);
  assert.equal(consumePasswordReset(token, [user], directory, 1002), null);
});

test('expired and malformed password reset tokens are rejected', (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'lebenslinien-reset-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const user = { id: 'user-1' };
  const { token } = issuePasswordReset(user, directory, 1000);

  assert.equal(consumePasswordReset(token, [user], directory, 1000 + PASSWORD_RESET_TTL_MS), null);
  assert.equal(consumePasswordReset('not-a-token', [user], directory), null);
});